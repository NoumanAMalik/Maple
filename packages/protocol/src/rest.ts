export interface CreateRoomRequest {
    content: string;
    language?: string;
}

export interface CreateRoomResponse {
    roomId: string;
    shareUrl: string;
}

export interface RoomInfoResponse {
    roomId: string;
    createdAt: string;
    participantCount: number;
}

export interface HealthResponse {
    status: "ok";
    version: string;
}

export interface ErrorResponse {
    error: string;
    code: string;
}
