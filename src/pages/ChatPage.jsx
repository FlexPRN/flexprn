import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, ArrowLeft, MessageSquare, Menu, X } from 'lucide-react'
import { useAuth } from '../useAuth'
import { useFacilityMember } from '../useFacilityMember'
import { supabase } from '../supabaseClient'
import { sendMessage, markConversationRead } from '../utils/chatHelpers'

function ChatPage({ viewerType }) {
  // viewerType is 'facility' or 'nurse' — passed in from App.jsx routes
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const facilityCtx = useFacilityMember()
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(searchParams.get('conversation') || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showListOnMobile, setShowListOnMobile] = useState(!searchParams.get('conversation'))
  const scrollRef = useRef(null)

  // Determine "me" for sender info
  let myUserId = user?.id
  let mySenderType = viewerType
  let myName = ''
  let myFacilityId = null
  let myNurseId = null

  if (viewerType === 'facility' && facilityCtx.member) {
    myName = `${facilityCtx.member.first_name} ${facilityCtx.member.last_name}`
    myFacilityId = facilityCtx.facility?.id
  } else if (viewerType === 'nurse' && profile) {
    myName = `${profile.first_name} ${profile.last_name}`
    myNurseId = profile.id
  }

  // Load conversations
  useEffect(() => {
    if (viewerType === 'facility' && !myFacilityId) return
    if (viewerType === 'nurse' && !myNurseId) return
    loadConversations()
  }, [myFacilityId, myNurseId])

  async function loadConversations() {
    let query = supabase
      .from('conversations')
      .select('*, facilities(id, facility_name, city, state), nurses(id, first_name, last_name, license_type)')
      .order('last_message_at', { ascending: false })

    if (viewerType === 'facility') query = query.eq('facility_id', myFacilityId)
    else query = query.eq('nurse_id', myNurseId)

    const { data } = await query
    setConversations(data || [])
    setLoading(false)

    // If URL has ?conversation=X, auto-open it
    const fromUrl = searchParams.get('conversation')
    if (fromUrl && (data || []).some(c => c.id === fromUrl)) {
      setActiveConvId(fromUrl)
    }
  }

  // Load messages for active conversation + subscribe to realtime
  useEffect(() => {
    if (!activeConvId) return
    loadMessages()
    markConversationRead(activeConvId, viewerType).then(() => loadConversations())

    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        // Mark as read if from other party
        if (payload.new.sender_type !== viewerType) {
          markConversationRead(activeConvId, viewerType).then(() => loadConversations())
        }
        // Auto-scroll
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }, 100)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeConvId])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 100)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || !activeConvId) return

    const activeConv = conversations.find(c => c.id === activeConvId)
    // Recipient email lookup
    let recipientEmail = null
    if (viewerType === 'facility') {
      // Get nurse email
      const { data: u } = await supabase.from('nurses').select('email').eq('id', activeConv.nurses.id).maybeSingle()
      recipientEmail = u?.email
    } else {
      // Get a facility admin email
      const { data: admins } = await supabase
        .from('facility_members')
        .select('email')
        .eq('facility_id', activeConv.facilities.id)
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1)
      recipientEmail = admins?.[0]?.email
    }

    const messageBody = text.trim()
    setText('')

    try {
      await sendMessage({
        conversationId: activeConvId,
        senderType: mySenderType,
        senderUserId: myUserId,
        senderName: myName,
        body: messageBody,
        recipientEmail
      })
      // Realtime will add it to UI
    } catch (err) {
      alert('Failed to send: ' + err.message)
      setText(messageBody)
    }
  }

  if (loading) return <div className="dashboard-loading">Loading messages...</div>

  const activeConv = conversations.find(c => c.id === activeConvId)

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo" onClick={() => navigate(viewerType === 'facility' ? '/facility/dashboard' : '/nurse/dashboard')} style={{ cursor: 'pointer' }}>⚡ Flexprn</div>
        <div className="dash-user">
          <button className="signout-btn" onClick={() => navigate(viewerType === 'facility' ? '/facility/dashboard' : '/nurse/dashboard')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
        {/* CONVERSATION LIST */}
        <div style={{
          width: '320px',
          borderRight: '1px solid #e5e7eb',
          overflowY: 'auto',
          background: 'white',
          display: showListOnMobile || window.innerWidth > 768 ? 'block' : 'none',
          flexShrink: 0
        }} className="chat-list-pane">
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
            <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: '1.25rem' }}>Messages</h2>
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No conversations yet.</p>
              <p style={{ fontSize: '0.85rem' }}>
                {viewerType === 'facility' ? 'Message a nurse from their profile to start.' : 'A facility will message you, or you can message one from their profile.'}
              </p>
            </div>
          ) : conversations.map(c => {
            const unread = viewerType === 'facility' ? c.facility_unread_count : c.nurse_unread_count
            const otherName = viewerType === 'facility'
              ? `${c.nurses?.first_name} ${c.nurses?.last_name}`
              : c.facilities?.facility_name
            const subtitle = viewerType === 'facility' ? c.nurses?.license_type : `${c.facilities?.city}, ${c.facilities?.state}`
            return (
              <div
                key={c.id}
                onClick={() => { setActiveConvId(c.id); setShowListOnMobile(false) }}
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: activeConvId === c.id ? '#f0f7f8' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1B3A6B', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {otherName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message_preview || subtitle}
                  </div>
                </div>
                {unread > 0 && (
                  <span style={{
                    background: '#DC2626', color: 'white', borderRadius: '999px',
                    padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                  }}>{unread}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* MESSAGE THREAD */}
        <div style={{
          flex: 1,
          display: !showListOnMobile || window.innerWidth > 768 ? 'flex' : 'none',
          flexDirection: 'column',
          background: '#f8fafc'
        }} className="chat-thread-pane">
          {!activeConvId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textAlign: 'center', padding: '2rem' }}>
              <div>
                <MessageSquare size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>Select a conversation to view messages.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowListOnMobile(true)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: window.innerWidth < 768 ? 'flex' : 'none' }}
                  aria-label="Back to list"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <div style={{ fontWeight: 600, color: '#1B3A6B' }}>
                    {viewerType === 'facility'
                      ? `${activeConv?.nurses?.first_name} ${activeConv?.nurses?.last_name}`
                      : activeConv?.facilities?.facility_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {viewerType === 'facility' ? activeConv?.nurses?.license_type : `${activeConv?.facilities?.city}, ${activeConv?.facilities?.state}`}
                  </div>
                </div>
              </div>

              {/* Messages list */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                    No messages yet. Say hi! 👋
                  </div>
                ) : messages.map(m => {
                  const isMine = m.sender_type === viewerType
                  return (
                    <div key={m.id} style={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        background: isMine ? '#1B3A6B' : 'white',
                        color: isMine ? 'white' : '#1f2937',
                        padding: '0.65rem 0.95rem',
                        borderRadius: '14px',
                        maxWidth: '70%',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        wordBreak: 'break-word'
                      }}>
                        {!isMine && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0A7E8C', marginBottom: '0.2rem' }}>
                            {m.sender_name}
                          </div>
                        )}
                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                        <div style={{
                          fontSize: '0.7rem',
                          opacity: 0.7,
                          marginTop: '0.25rem',
                          textAlign: isMine ? 'right' : 'left'
                        }}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} style={{
                padding: '0.75rem',
                borderTop: '1px solid #e5e7eb',
                background: 'white',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.9rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '999px',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
                <button type="submit" disabled={!text.trim()} style={{
                  background: '#1B3A6B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '999px',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  opacity: text.trim() ? 1 : 0.5
                }}>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatPage