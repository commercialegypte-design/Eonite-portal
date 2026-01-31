import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { DailyWebhookEvent, DailyParticipantJoinedPayload, DailyMeetingEndedPayload, DailyNotificationInsert } from '@/types/daily'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function POST(request: NextRequest) {
    try {
        // Parse the webhook payload
        const event: DailyWebhookEvent = await request.json()

        console.log('Received Daily.co webhook:', event.type, event.payload)

        // Handle different event types
        if (event.type === 'participant.joined') {
            await handleParticipantJoined(event)
        } else if (event.type === 'meeting.ended') {
            await handleMeetingEnded(event)
        } else {
            // Log unknown event types for debugging
            console.log('Unknown Daily.co event type:', event.type)
        }

        // Return success response
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('Error processing Daily.co webhook:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function handleParticipantJoined(event: DailyWebhookEvent) {
    const payload = event.payload as DailyParticipantJoinedPayload

    const notification: DailyNotificationInsert = {
        notification_type: 'participant_joined',
        room_name: payload.room,
        participant_name: payload.user_name || 'Unknown Participant',
        participant_id: payload.session_id,
        event_data: payload,
        is_read: false
    }

    const { error } = await supabase
        .from('daily_notifications')
        .insert(notification)

    if (error) {
        console.error('Error inserting participant joined notification:', error)
        throw error
    }

    console.log('Participant joined notification created:', payload.user_name, 'in room', payload.room)
}

async function handleMeetingEnded(event: DailyWebhookEvent) {
    const payload = event.payload as DailyMeetingEndedPayload

    const notification: DailyNotificationInsert = {
        notification_type: 'meeting_ended',
        room_name: payload.room,
        participant_name: undefined,
        participant_id: undefined,
        event_data: payload,
        is_read: false
    }

    const { error } = await supabase
        .from('daily_notifications')
        .insert(notification)

    if (error) {
        console.error('Error inserting meeting ended notification:', error)
        throw error
    }

    console.log('Meeting ended notification created for room:', payload.room)
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Daily.co webhook endpoint is active',
        timestamp: new Date().toISOString()
    })
}
