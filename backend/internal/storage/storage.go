package storage

import (
	"context"
	"errors"
	"fmt"
	"io"

	"driverlogs/backend/internal/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var ErrUnavailable = errors.New("file storage is not configured")

type Client interface {
	Enabled() bool
	Put(ctx context.Context, key string, body io.Reader, contentType string, size int64) error
	Get(ctx context.Context, key string) (Object, error)
	Delete(ctx context.Context, key string) error
}

type Object struct {
	Body        io.ReadCloser
	ContentType string
	Size        int64
}

type DisabledClient struct{}

func (DisabledClient) Enabled() bool { return false }

func (DisabledClient) Put(context.Context, string, io.Reader, string, int64) error {
	return ErrUnavailable
}

func (DisabledClient) Get(context.Context, string) (Object, error) {
	return Object{}, ErrUnavailable
}

func (DisabledClient) Delete(context.Context, string) error {
	return ErrUnavailable
}

type S3Client struct {
	bucket string
	client *s3.Client
}

func New(ctx context.Context, cfg config.StorageConfig) (Client, error) {
	if cfg.Provider == "" {
		return DisabledClient{}, nil
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.S3AccessKeyID, cfg.S3SecretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load s3 config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.UsePathStyle = cfg.S3PathStyle
		if cfg.S3Endpoint != "" {
			options.BaseEndpoint = aws.String(cfg.S3Endpoint)
		}
	})
	return S3Client{bucket: cfg.S3Bucket, client: client}, nil
}

func (c S3Client) Enabled() bool { return true }

func (c S3Client) Put(ctx context.Context, key string, body io.Reader, contentType string, size int64) error {
	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          body,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("put s3 object: %w", err)
	}
	return nil
}

func (c S3Client) Get(ctx context.Context, key string) (Object, error) {
	output, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return Object{}, fmt.Errorf("get s3 object: %w", err)
	}
	contentType := "application/pdf"
	if output.ContentType != nil && *output.ContentType != "" {
		contentType = *output.ContentType
	}
	size := int64(0)
	if output.ContentLength != nil {
		size = *output.ContentLength
	}
	return Object{Body: output.Body, ContentType: contentType, Size: size}, nil
}

func (c S3Client) Delete(ctx context.Context, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("delete s3 object: %w", err)
	}
	return nil
}
