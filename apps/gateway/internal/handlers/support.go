package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/gemverify/gateway/internal/config"
	"github.com/gemverify/gateway/internal/database"
)

type SupportHandler struct {
	cfg *config.Config
}

func NewSupportHandler(cfg *config.Config) *SupportHandler {
	return &SupportHandler{cfg: cfg}
}

func (h *SupportHandler) InitTable() error {
	_, err := database.Pool.Exec(context.Background(), `
	CREATE TABLE IF NOT EXISTS support_messages (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tender_id UUID NOT NULL REFERENCES tenders(id),
		sender_id UUID NOT NULL REFERENCES users(id),
		receiver_id UUID REFERENCES users(id),
		message TEXT NOT NULL,
		message_type VARCHAR(50) DEFAULT 'text',
		metadata JSONB DEFAULT '{}',
		is_read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMPTZ DEFAULT NOW()
	)`)
	return err
}

func (h *SupportHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	type Request struct {
		TenderID    string                 `json:"tender_id"`
		ReceiverID  string                 `json:"receiver_id"`
		Message     string                 `json:"message"`
		MessageType string                 `json:"message_type"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.Metadata == nil {
		req.Metadata = make(map[string]interface{})
	}

	query := `
		INSERT INTO support_messages (tender_id, sender_id, receiver_id, message, message_type, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, is_read
	`
	var msgID string
	var createdAt time.Time
	var isRead bool

	err := database.Pool.QueryRow(context.Background(), query,
		req.TenderID, userID, req.ReceiverID, req.Message, req.MessageType, req.Metadata).
		Scan(&msgID, &createdAt, &isRead)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to send message"})
	}

	return c.Status(201).JSON(fiber.Map{
		"id":           msgID,
		"tender_id":    req.TenderID,
		"sender_id":    userID,
		"receiver_id":  req.ReceiverID,
		"message":      req.Message,
		"message_type": req.MessageType,
		"metadata":     req.Metadata,
		"is_read":      isRead,
		"created_at":   createdAt.Format(time.RFC3339),
	})
}

func (h *SupportHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	tenderID := c.Query("tender_id")
	withUser := c.Query("with_user")

	if tenderID == "" || withUser == "" {
		return c.Status(400).JSON(fiber.Map{"error": "tender_id and with_user are required"})
	}

	// Mark unread messages from withUser as read
	markReadQuery := `
		UPDATE support_messages
		SET is_read = TRUE
		WHERE tender_id = $1 AND sender_id = $2 AND receiver_id = $3 AND is_read = FALSE
	`
	_, _ = database.Pool.Exec(context.Background(), markReadQuery, tenderID, withUser, userID)

	query := `
		SELECT sm.id, sm.tender_id, sm.sender_id, sm.receiver_id, sm.message, sm.message_type, sm.metadata, sm.is_read, sm.created_at,
		       u.full_name, u.role
		FROM support_messages sm
		JOIN users u ON sm.sender_id = u.id
		WHERE sm.tender_id = $1 AND (
			(sm.sender_id = $2 AND sm.receiver_id = $3) OR
			(sm.sender_id = $3 AND sm.receiver_id = $2)
		)
		ORDER BY sm.created_at ASC
	`
	rows, err := database.Pool.Query(context.Background(), query, tenderID, userID, withUser)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	var messages []fiber.Map
	for rows.Next() {
		var id, tID, sID, rID, msg, msgType, senderName, senderRole string
		var isRead bool
		var createdAt time.Time
		var metadata map[string]interface{}

		if err := rows.Scan(&id, &tID, &sID, &rID, &msg, &msgType, &metadata, &isRead, &createdAt, &senderName, &senderRole); err != nil {
			continue
		}

		messages = append(messages, fiber.Map{
			"id":           id,
			"tender_id":    tID,
			"sender_id":    sID,
			"receiver_id":  rID,
			"message":      msg,
			"message_type": msgType,
			"metadata":     metadata,
			"is_read":      isRead,
			"created_at":   createdAt.Format(time.RFC3339),
			"sender_name":  senderName,
			"sender_role":  senderRole,
		})
	}

	if messages == nil {
		messages = []fiber.Map{}
	}

	return c.JSON(messages)
}

func (h *SupportHandler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	role := c.Locals("role").(string)
	tenderID := c.Query("tender_id")

	var query string
	var args []interface{}
	
	if role == "officer" || role == "admin" {
		if tenderID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "tender_id is required for officers"})
		}
		
		query = `
			SELECT DISTINCT ON (other_user_id)
				other_user_id as user_id,
				u.full_name as user_name,
				u.organization as user_org,
				sm.id as latest_msg_id,
				sm.message as latest_message,
				sm.created_at as latest_created_at,
				(SELECT count(*) FROM support_messages sm2 WHERE sm2.tender_id = sm.tender_id AND sm2.sender_id = other_user_id AND sm2.receiver_id = $1 AND sm2.is_read = FALSE) as unread_count
			FROM (
				SELECT tender_id,
				       CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
					   id, message, created_at
				FROM support_messages
				WHERE tender_id = $2 AND (sender_id = $1 OR receiver_id = $1)
				ORDER BY created_at DESC
			) sm
			JOIN users u ON sm.other_user_id = u.id
			ORDER BY other_user_id, sm.created_at DESC
		`
		args = append(args, userID, tenderID)
	} else {
		query = `
			SELECT DISTINCT ON (sm.tender_id, other_user_id)
				sm.tender_id,
				t.title as tender_title,
				other_user_id as user_id,
				u.full_name as user_name,
				sm.id as latest_msg_id,
				sm.message as latest_message,
				sm.created_at as latest_created_at,
				(SELECT count(*) FROM support_messages sm2 WHERE sm2.tender_id = sm.tender_id AND sm2.sender_id = other_user_id AND sm2.receiver_id = $1 AND sm2.is_read = FALSE) as unread_count
			FROM (
				SELECT tender_id,
				       CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
					   id, message, created_at
				FROM support_messages
				WHERE sender_id = $1 OR receiver_id = $1
				ORDER BY created_at DESC
			) sm
			JOIN users u ON sm.other_user_id = u.id
			JOIN tenders t ON sm.tender_id = t.id
			ORDER BY sm.tender_id, other_user_id, sm.created_at DESC
		`
		args = append(args, userID)
	}

	rows, err := database.Pool.Query(context.Background(), query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	var conversations []fiber.Map
	for rows.Next() {
		var unreadCount int
		var latestMsgID, latestMessage string
		var latestCreatedAt time.Time
		
		if role == "officer" || role == "admin" {
			var uid, uName string
			var uOrg *string
			if err := rows.Scan(&uid, &uName, &uOrg, &latestMsgID, &latestMessage, &latestCreatedAt, &unreadCount); err != nil {
				continue
			}
			conv := fiber.Map{
				"user_id": uid,
				"user_name": uName,
				"latest_msg_id": latestMsgID,
				"latest_message": latestMessage,
				"latest_created_at": latestCreatedAt.Format(time.RFC3339),
				"unread_count": unreadCount,
			}
			if uOrg != nil {
				conv["user_org"] = *uOrg
			}
			conversations = append(conversations, conv)
		} else {
			var tID, tTitle, uid, uName string
			if err := rows.Scan(&tID, &tTitle, &uid, &uName, &latestMsgID, &latestMessage, &latestCreatedAt, &unreadCount); err != nil {
				continue
			}
			conversations = append(conversations, fiber.Map{
				"tender_id": tID,
				"tender_title": tTitle,
				"user_id": uid,
				"user_name": uName,
				"latest_msg_id": latestMsgID,
				"latest_message": latestMessage,
				"latest_created_at": latestCreatedAt.Format(time.RFC3339),
				"unread_count": unreadCount,
			})
		}
	}

	if conversations == nil {
		conversations = []fiber.Map{}
	}

	return c.JSON(conversations)
}

func (h *SupportHandler) GetUnreadCount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	query := `SELECT COUNT(*) FROM support_messages WHERE receiver_id = $1 AND is_read = FALSE`
	var count int
	if err := database.Pool.QueryRow(context.Background(), query, userID).Scan(&count); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"unread_count": count})
}

func (h *SupportHandler) MarkRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	msgID := c.Params("id")

	query := `UPDATE support_messages SET is_read = TRUE WHERE id = $1 AND receiver_id = $2`
	_, err := database.Pool.Exec(context.Background(), query, msgID, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"success": true})
}
