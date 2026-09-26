package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

var Client *redis.Client

func Connect(redisURL string) error {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	Client = redis.NewClient(opts)

	// Test connection
	if err := Client.Ping(context.Background()).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info().Msg("✅ Redis connected")
	return nil
}

func Close() {
	if Client != nil {
		Client.Close()
		log.Info().Msg("Redis connection closed")
	}
}

// Set gracefully stores a value in Redis with an expiration time
func Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if Client == nil {
		return nil
	}
	
	bytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal cache value: %w", err)
	}
	
	return Client.Set(ctx, key, bytes, expiration).Err()
}

// Get gracefully retrieves a value from Redis
func Get(ctx context.Context, key string, dest interface{}) error {
	if Client == nil {
		return redis.Nil
	}
	
	val, err := Client.Get(ctx, key).Result()
	if err != nil {
		return err
	}
	
	return json.Unmarshal([]byte(val), dest)
}

// Delete gracefully removes a key from Redis
func Delete(ctx context.Context, key string) error {
	if Client == nil {
		return nil
	}
	return Client.Del(ctx, key).Err()
}
