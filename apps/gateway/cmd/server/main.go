package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/cache"
	"github.com/gemverify/gateway/internal/config"
	"github.com/gemverify/gateway/internal/database"
	"github.com/gemverify/gateway/internal/grpcclient"
	"github.com/gemverify/gateway/internal/handlers"
	"github.com/gemverify/gateway/internal/middleware"
	"github.com/gemverify/gateway/internal/storage"
	"github.com/gemverify/gateway/internal/ws"
)

func main() {
	// Configure zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("🚀 GemVerify Gateway starting up...")

	// Load config
	cfg := config.Load()

	// Connect to PostgreSQL
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(context.Background()); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Connect to Redis
	if err := cache.Connect(cfg.RedisURL); err != nil {
		log.Warn().Err(err).Msg("⚠️ Redis connection failed — running without cache/pubsub")
	} else {
		defer cache.Close()
	}

	// Connect to MinIO
	if err := storage.Connect(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOBucket, cfg.MinIOUseSSL); err != nil {
		log.Warn().Err(err).Msg("⚠️ MinIO connection failed — file uploads will not work")
	}

	// Connect to AI Service (gRPC)
	if err := grpcclient.Connect(cfg.AIServiceAddr); err != nil {
		log.Warn().Err(err).Msg("⚠️ AI service connection failed — pipeline will not run")
	} else {
		defer grpcclient.Close()
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "GemVerify Gateway",
		BodyLimit: 50 * 1024 * 1024, // 50MB
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// --- Health Check ---
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":         "healthy",
			"service":        "GemVerify Gateway",
			"version":        "1.0.0",
			"ws_connections": ws.GlobalHub.ActiveCount(),
		})
	})

	// --- Auth Routes ---
	authHandler := handlers.NewAuthHandler(cfg)
	auth := app.Group("/api/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Get("/me", middleware.AuthRequired(cfg), authHandler.GetMe)

	// --- Protected API Routes ---
	api := app.Group("/api", middleware.AuthRequired(cfg))

	// Tender routes
	tenderHandler := handlers.NewTenderHandler(cfg)
	api.Get("/tenders", tenderHandler.ListTenders)
	api.Get("/tenders/:id", tenderHandler.GetTender)
	api.Post("/tenders", middleware.RequireRole("officer", "admin"), tenderHandler.CreateTender)
	api.Patch("/tenders/:id/status", middleware.RequireRole("officer", "admin"), tenderHandler.UpdateTenderStatus)

	// Bid routes
	bidHandler := handlers.NewBidHandler(cfg)
	api.Post("/bids", middleware.RequireRole("bidder"), bidHandler.SubmitBid)
	api.Get("/bids/my", middleware.RequireRole("bidder"), bidHandler.GetMyBids)
	api.Get("/tenders/:tenderId/bids", middleware.RequireRole("officer", "admin"), bidHandler.ListBidsForTender)
	api.Post("/bids/:id/decision", middleware.RequireRole("officer", "admin"), bidHandler.OfficerDecision)

	// Compliance routes
	complianceHandler := handlers.NewComplianceHandler(cfg)
	api.Get("/bids/:bidId/compliance", complianceHandler.GetComplianceResult)
	api.Get("/bids/:bidId/documents", complianceHandler.GetBidDocuments)
	api.Post("/bids/:bidId/pipeline", middleware.RequireRole("officer", "admin"), complianceHandler.TriggerPipeline)

	// Audit trail routes
	auditHandler := handlers.NewAuditHandler(cfg)
	api.Get("/audit", middleware.RequireRole("officer", "admin"), auditHandler.ListAuditEntries)

	// Analytics routes (officer/admin only)
	analyticsHandler := handlers.NewAnalyticsHandler(database.Pool)
	api.Get("/analytics/summary", middleware.RequireRole("officer", "admin"), analyticsHandler.GetSummary)
	api.Get("/analytics/department-stats", middleware.RequireRole("officer", "admin"), analyticsHandler.GetDepartmentStats)
	api.Get("/analytics/risk-distribution", middleware.RequireRole("officer", "admin"), analyticsHandler.GetRiskDistribution)
	api.Get("/analytics/requirement-compliance", middleware.RequireRole("officer", "admin"), analyticsHandler.GetRequirementCompliance)
	api.Get("/analytics/timeline", middleware.RequireRole("officer", "admin"), analyticsHandler.GetTimeline)
	api.Get("/analytics/score-dimensions", middleware.RequireRole("officer", "admin"), analyticsHandler.GetScoreDimensions)

	// Copilot routes
	copilotHandler := handlers.NewCopilotHandler()
	api.Post("/copilot/ask", copilotHandler.AskCopilot)

	// Support/messaging routes
	supportHandler := handlers.NewSupportHandler(cfg)
	supportHandler.InitTable()
	api.Post("/support/messages", supportHandler.SendMessage)
	api.Get("/support/messages", supportHandler.GetMessages)
	api.Get("/support/conversations", supportHandler.GetConversations)
	api.Get("/support/unread-count", supportHandler.GetUnreadCount)
	api.Post("/support/messages/:id/read", supportHandler.MarkRead)

	// New Bid routes
	api.Post("/bids/:id/withdraw", middleware.RequireRole("bidder"), bidHandler.WithdrawBid)
	api.Get("/bids/all", middleware.RequireRole("officer", "admin"), bidHandler.ListAllBids)

	// --- WebSocket Endpoint ---
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws/:token", websocket.New(func(c *websocket.Conn) {
		token := c.Params("token")
		claims, err := middleware.ParseToken(token, cfg)
		if err != nil {
			c.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(4001, "Invalid token"))
			c.Close()
			return
		}

		ws.GlobalHub.Register(c, claims.UserID, claims.Role)
		defer ws.GlobalHub.Unregister(c, claims.UserID, claims.Role)

		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				break
			}
			// Echo for now — will handle copilot chat, etc. later
			ws.GlobalHub.SendToUser(claims.UserID, ws.Message{
				Type: "echo",
				Data: string(msg),
			})
		}
	}))

	// --- Graceful Shutdown ---
	go func() {
		addr := fmt.Sprintf("%s:%s", cfg.ServerHost, cfg.ServerPort)
		log.Info().Str("addr", addr).Msg("🌐 Gateway listening")
		if err := app.Listen(addr); err != nil {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("👋 Shutting down gracefully...")
	app.Shutdown()
}
