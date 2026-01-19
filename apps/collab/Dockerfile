FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /collab ./cmd/collab

FROM alpine:3.20

RUN apk --no-cache add ca-certificates

WORKDIR /

COPY --from=builder /collab /collab

EXPOSE 8080

CMD ["/collab"]
