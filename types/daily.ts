// Daily.co webhook event types and notification interfaces

export type NotificationType = 'participant_joined' | 'meeting_ended'

export interface DailyParticipantJoinedPayload {
    joined_at: number // Unix epoch time in seconds
    session_id: string // User's session ID or participant ID
    room: string // Room name
    user_id?: string // ID of the user (from meeting token)
    user_name?: string // Name of the user (from meeting token)
    owner?: boolean // Flag indicating if user is owner
    networkQualityState?: 'unknown' | 'good' | 'warning' | 'bad'
    will_eject_at?: number // Unix epoch time when participant will be ejected
    permissions?: Record<string, any>
}

export interface DailyMeetingEndedPayload {
    room: string // Room name
    ended_at?: number // Unix epoch time in seconds
    duration?: number // Meeting duration in seconds
}

export interface DailyWebhookEvent {
    version: string // Semantic version of the event message
    type: string // Event type (e.g., "participant.joined", "meeting.ended")
    event_ts: number // Unix epoch time in seconds when webhook was sent
    payload: DailyParticipantJoinedPayload | DailyMeetingEndedPayload
}

export interface DailyNotification {
    id: string
    notification_type: NotificationType
    room_name: string
    participant_name: string | null
    participant_id: string | null
    event_data: Record<string, any> | null
    is_read: boolean
    created_at: string
}

export interface DailyNotificationInsert {
    notification_type: NotificationType
    room_name: string
    participant_name?: string
    participant_id?: string
    event_data?: Record<string, any>
    is_read?: boolean
}
