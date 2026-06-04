import { supabase } from '../supabaseClient'

// Get or create a conversation between a facility and nurse
export async function getOrCreateConversation(facilityId, nurseId) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('nurse_id', nurseId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('conversations')
    .insert({ facility_id: facilityId, nurse_id: nurseId })
    .select()
    .single()

  if (error) throw error
  return data
}

// Send a message + update conversation metadata + maybe send email
export async function sendMessage({ conversationId, senderType, senderUserId, senderName, body, recipientEmail }) {
  // Insert message
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_user_id: senderUserId,
      sender_name: senderName,
      body
    })
    .select()
    .single()

  if (msgErr) throw msgErr

  // Update conversation: bump unread count for OTHER party, set last_message_at
  const unreadField = senderType === 'facility' ? 'nurse_unread_count' : 'facility_unread_count'
  const { data: conv } = await supabase.from('conversations').select(unreadField).eq('id', conversationId).single()
  await supabase
    .from('conversations')
    .update({
      [unreadField]: (conv?.[unreadField] || 0) + 1,
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 100),
      last_message_sender_type: senderType
    })
    .eq('id', conversationId)

  // Fire-and-forget email notification (Edge Function handles throttling)
  if (recipientEmail) {
    supabase.functions.invoke('send-chat-notification', {
      body: { conversationId, recipientEmail, senderName, messagePreview: body.slice(0, 200) }
    }).catch(err => console.warn('Chat email notify failed (non-blocking):', err))
  }

  return msg
}

// Mark all messages in a conversation as read for this user
export async function markConversationRead(conversationId, viewerType) {
  const unreadField = viewerType === 'facility' ? 'facility_unread_count' : 'nurse_unread_count'
  await supabase.from('conversations').update({ [unreadField]: 0 }).eq('id', conversationId)

  // Mark messages from OTHER party as read
  const otherType = viewerType === 'facility' ? 'nurse' : 'facility'
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('sender_type', otherType)
    .is('read_at', null)
}