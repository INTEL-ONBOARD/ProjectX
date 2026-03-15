import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Search, Paperclip, Smile, Check, CheckCheck, Pin, Star, Archive, Trash2, X, MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useMembersContext } from '../context/MembersContext';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };
const statusLabel = { online: 'Online', away: 'Away', offline: 'Offline' };

type Msg = { id: string; from: string; text: string; time: string; read: boolean; reactions?: string[] };

const emojis = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];

const MessagesPage: React.FC = () => {
  useContext(AppContext); // keep context subscription for future use
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbApi = () => (window as any).electronAPI.db;
  // Single source of truth: authUser.id is always available after login
  const myId = authUser?.id ?? '';
  const currentUserId = myId;
  const [activeId, setActiveId] = useState('');
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [msgFilter, setMsgFilter] = useState<'all' | 'unread' | 'pinned'>('all');
  const [showNewConvo, setShowNewConvo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const { members, getMemberColor } = useMembersContext();
  const conversations = members.filter(m => m.id !== myId);

  useEffect(() => {
    const memberId = (location.state as any)?.memberId;
    if (memberId) {
      setActiveId(memberId);
      setChats(prev => ({ ...prev, [memberId]: prev[memberId] ?? [] }));
    }
  }, [location.state]);

  const activeMember = members.find(m => m.id === activeId) ?? members[0] ?? null;
  const activeColor = getMemberColor(activeId);
  const activeChats = chats[activeId] ?? [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChats.length, activeId]);

  // Mark as read when switching conversation
  useEffect(() => {
    setChats(prev => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map(m => ({ ...m, read: true })),
    }));
  }, [activeId]);

  // Load messages from DB when active peer changes
  useEffect(() => {
    if (!activeMember) return;
    dbApi().getMessagesBetween(currentUserId, activeMember.id)
        .then((msgs: Msg[]) => setChats(prev => ({ ...prev, [activeMember.id]: msgs })))
        .catch((err: unknown) => console.error('[MessagesPage] Failed to load messages:', err));
  }, [activeMember?.id, currentUserId]);

  // Load conv meta (pin/star/archive) on mount
  useEffect(() => {
    dbApi().getConvMeta(currentUserId)
        .then((metas: Array<{ peerId: string; pinned: boolean; starred: boolean; archived: boolean }>) => {
            const pinned: string[] = [];
            const starred: string[] = [];
            const archived = new Set<string>();
            metas.forEach(m => {
                if (m.pinned) pinned.push(m.peerId);
                if (m.starred) starred.push(m.peerId);
                if (m.archived) archived.add(m.peerId);
            });
            setPinnedIds(pinned);
            setStarredIds(starred);
            setArchivedIds(archived);
        })
        .catch((err: unknown) => console.error('[MessagesPage] Failed to load conv meta:', err));
  }, [currentUserId]);

  const totalUnread = conversations.reduce((sum, m) => {
    const msgs = chats[m.id] ?? [];
    return sum + msgs.filter(msg => !msg.read && msg.from !== myId).length;
  }, 0);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Msg = {
      id: `m${Date.now()}`,
      from: myId,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setChats(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), newMsg] }));
    dbApi().sendMessage({ fromId: currentUserId, toId: activeMember?.id ?? activeId, text: input.trim(), timestamp: newMsg.time })
        .then((saved: Msg) => {
          setChats(prev => ({
            ...prev,
            [activeId]: (prev[activeId] ?? []).map(m => m.id === newMsg.id ? { ...m, id: saved.id } : m),
          }));
        })
        .catch((err: unknown) => console.error('[MessagesPage] Failed to send message:', err));
    setInput('');
    inputRef.current?.focus();
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const prevChats = chats[activeId] ?? [];
    setChats(prev => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map(m =>
        m.id === msgId ? { ...m, reactions: [...(m.reactions ?? []).filter(e => e !== emoji), emoji] } : m
      ),
    }));
    setShowEmojiPicker(null);
    try {
      await dbApi().reactToMessage(msgId, myId, emoji);
    } catch (err: unknown) {
      console.error('[MessagesPage] Failed to save reaction:', err);
      setChats(prev => ({ ...prev, [activeId]: prevChats }));
      showToast('Failed to save reaction.', 'error');
    }
  };

  const deleteMessage = async (msgId: string) => {
    const prevChats = chats[activeId] ?? [];
    setChats(prev => ({ ...prev, [activeId]: prev[activeId].filter(m => m.id !== msgId) }));
    setShowContextMenu(null);
    try {
      await dbApi().deleteMessage(msgId);
    } catch (err: unknown) {
      console.error('[MessagesPage] Failed to delete message:', err);
      setChats(prev => ({ ...prev, [activeId]: prevChats }));
      showToast('Failed to delete message.', 'error');
    }
  };

  const filteredConvos = conversations.filter(m => {
    if (archivedIds.has(m.id)) return false;
    if (!m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (msgFilter === 'pinned') return pinnedIds.includes(m.id);
    if (msgFilter === 'unread') return !openedIds.has(m.id);
    return true;
  });

  const getLastMsg = (userId: string) => {
    const msgs = chats[userId] ?? [];
    return msgs[msgs.length - 1];
  };

  const getUnread = (userId: string) => {
    return (chats[userId] ?? []).filter(m => !m.read && m.from !== myId).length;
  };

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 pb-6 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      onClick={() => { setShowContextMenu(null); setShowEmojiPicker(null); }}
    >
      <div className="pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Messages"
          title="Messages"
          description={totalUnread > 0 ? `${totalUnread} unread messages` : 'Team conversations'}
          actions={
            <motion.button
              onClick={() => setShowNewConvo(true)}
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} /> New Message
            </motion.button>
          }
        />
      </div>


      {/* Main chat layout — single unified card */}
      {members.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-gray-400">
          <MessageSquare size={40} className="opacity-30" />
          <p className="text-sm font-medium">No team members yet.</p>
          <p className="text-xs">Invite members from the Members page to start messaging.</p>
        </div>
      ) : !activeMember ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-gray-400">
          <MessageSquare size={40} className="opacity-30" />
          <p className="text-sm font-medium">No conversations yet.</p>
          <p className="text-xs">Click <strong>New Message</strong> to start a conversation.</p>
        </div>
      ) : (
      <div className="flex flex-1 min-h-0 bg-white border border-surface-200 rounded-2xl overflow-hidden">

        {/* Left sidebar */}
        <div
          className="w-72 shrink-0 border-r border-surface-100 flex flex-col"
        >
          {/* Search */}
          <div className="p-3 border-b border-surface-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 flex items-center gap-2 bg-surface-100 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                />
                {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-400" /></button>}
              </div>
              <button
                onClick={() => setShowNewConvo(v => !v)}
                className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors shrink-0"
                title="New conversation"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 px-3 py-2 border-b border-surface-100">
            {(['all', 'unread', 'pinned'] as const).map(f => (
              <button key={f} onClick={() => setMsgFilter(f)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors capitalize ${msgFilter === f ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-surface-100'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto relative">
            {filteredConvos.map((member, i) => {
              const color = getMemberColor(member.id);
              const lastMsg = getLastMsg(member.id);
              const unread = getUnread(member.id);
              const isActive = member.id === activeId;
              const isPinned = pinnedIds.includes(member.id);
              const isStarred = starredIds.includes(member.id);
              const status: 'online' | 'offline' = member.status === 'active' ? 'online' : 'offline';
              return (
                <motion.button
                  key={member.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isActive ? 'bg-primary-50 border-r-2 border-primary-500' : 'hover:bg-surface-50'}`}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => { setActiveId(member.id); setOpenedIds(p => new Set([...p, member.id])); }}
                >
                  <div className="relative shrink-0">
                    <Avatar name={member.name} color={color} size="md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: statusColor[status] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>{member.name}</span>
                      {isPinned && <Pin size={10} className="text-gray-400 shrink-0" />}
                      {isStarred && <Star size={10} className="text-[#FFA500] shrink-0" fill="#FFA500" />}
                    </div>
                    <div className={`text-xs truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {lastMsg?.from === myId ? '✓ ' : ''}{lastMsg?.text ?? 'No messages yet'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-gray-400">{lastMsg?.time}</span>
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center px-1">{unread}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-100 shrink-0">
            <div className="relative">
              <Avatar name={activeMember?.name ?? '—'} color={activeColor} size="md" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: statusColor[activeMember?.status === 'active' ? 'online' : 'offline'] }} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-gray-900">{activeMember?.name ?? '—'}</div>
              <div className="text-xs text-gray-400">{activeMember?.designation ?? ''} · <span style={{ color: statusColor[activeMember?.status === 'active' ? 'online' : 'offline'] }}>{statusLabel[activeMember?.status === 'active' ? 'online' : 'offline']}</span></div>
            </div>
            {/* Action icons */}
            <div className="flex items-center gap-1">
              <motion.button
                onClick={e => { e.stopPropagation(); setPinnedIds(p => p.includes(activeId) ? p.filter(x => x !== activeId) : [...p, activeId]); if (activeMember) { dbApi().setConvMeta({ userId: currentUserId, peerId: activeMember.id, pinned: !pinnedIds.includes(activeMember.id), starred: starredIds.includes(activeMember.id), archived: archivedIds.has(activeMember.id) }).catch((err: unknown) => console.error('[MessagesPage] Failed to persist conv meta:', err)); } }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${pinnedIds.includes(activeId) ? 'text-primary-500 bg-primary-50' : 'text-gray-400 hover:bg-surface-100'}`}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                title="Pin conversation"
              >
                <Pin size={16} />
              </motion.button>
              <motion.button
                onClick={e => { e.stopPropagation(); setStarredIds(p => p.includes(activeId) ? p.filter(x => x !== activeId) : [...p, activeId]); if (activeMember) { dbApi().setConvMeta({ userId: currentUserId, peerId: activeMember.id, pinned: pinnedIds.includes(activeMember.id), starred: !starredIds.includes(activeMember.id), archived: archivedIds.has(activeMember.id) }).catch((err: unknown) => console.error('[MessagesPage] Failed to persist conv meta:', err)); } }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${starredIds.includes(activeId) ? 'text-[#FFA500] bg-[#FFA50015]' : 'text-gray-400 hover:bg-surface-100'}`}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                title="Star conversation"
              >
                <Star size={16} fill={starredIds.includes(activeId) ? '#FFA500' : 'none'} />
              </motion.button>

            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {activeChats.map((msg, i) => {
              const isOwn = msg.from === myId;
              const sender = members.find(m => m.id === msg.from) ?? { name: 'Unknown' };
              const senderColor = getMemberColor(msg.from);
              const showAvatar = !isOwn && (i === 0 || activeChats[i - 1]?.from !== msg.from);
              return (
                <motion.div
                  key={msg.id}
                  className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Avatar placeholder to keep alignment */}
                  <div className="w-7 shrink-0">
                    {showAvatar && !isOwn && <Avatar name={sender.name} color={senderColor} size="sm" />}
                  </div>

                  <div className={`max-w-[62%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isOwn && (
                      <span className="text-[10px] text-gray-400 font-semibold mb-1 ml-1">{sender.name.split(' ')[0]}</span>
                    )}
                    <div className="relative">
                      <div
                        className={`px-4 py-2.5 text-sm rounded-2xl cursor-pointer select-text ${
                          isOwn
                            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-sm'
                            : 'bg-surface-100 text-gray-800 rounded-bl-sm hover:bg-surface-200'
                        } transition-colors`}
                        onContextMenu={e => { e.preventDefault(); setShowContextMenu({ id: msg.id, x: e.clientX, y: e.clientY }); }}
                      >
                        {msg.text}
                      </div>
                      {/* Reaction button */}
                      <button
                        className={`absolute -top-2 ${isOwn ? 'left-0 -translate-x-full ml-[-4px]' : 'right-0 translate-x-full mr-[-4px]'} opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-white border border-surface-200 flex items-center justify-center text-xs`}
                        onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => p === msg.id ? null : msg.id); }}
                      >
                        <Smile size={13} className="text-gray-500" />
                      </button>
                      {/* Emoji picker */}
                      <AnimatePresence>
                        {showEmojiPicker === msg.id && (
                          <motion.div
                            className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} bg-white rounded-xl shadow-card-hover border border-surface-100 flex gap-1 px-2 py-1.5 z-10`}
                            initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 4 }}
                            transition={{ duration: 0.15 }}
                            onClick={e => e.stopPropagation()}
                          >
                            {emojis.map(e => (
                              <button key={e} onClick={() => addReaction(msg.id, e)} className="text-base hover:scale-125 transition-transform">{e}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {/* Reactions display */}
                    {(msg.reactions ?? []).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {msg.reactions!.map((r, ri) => (
                          <span key={ri} className="text-xs bg-white border border-surface-200 rounded-full px-1.5 py-0.5 shadow-sm">{r}</span>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 text-[10px] text-gray-400 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span>{msg.time}</span>
                      {isOwn && (
                        msg.read
                          ? <CheckCheck size={12} className="text-primary-400" />
                          : <Check size={12} className="text-gray-300" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-5 py-3 border-t border-surface-100 shrink-0">
            <div className="flex items-center gap-2 bg-surface-50 rounded-2xl px-4 py-2.5 border border-surface-200 focus-within:border-primary-300 transition-colors">
              <button onClick={() => attachRef.current?.click()} className="text-gray-400 hover:text-primary-500 transition-colors shrink-0">
                <Paperclip size={16} />
              </button>
              <input ref={attachRef} type="file" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setChats(prev => ({
                  ...prev,
                  [activeId]: [...(prev[activeId] ?? []), {
                    id: String(Date.now()),
                    from: myId,
                    text: `📎 ${file.name}`,
                    time: now,
                    read: true,
                  }],
                }));
                e.target.value = '';
              }} />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message ${(activeMember?.name ?? '—').split(' ')[0]}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowEmojiPicker(p => p === 'input' ? null : 'input')}
                  className="text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <Smile size={16} />
                </button>
                {showEmojiPicker === 'input' && (
                  <div className="absolute bottom-full mb-1 right-0 bg-white rounded-xl shadow-lg border border-surface-100 flex gap-1 px-2 py-1.5 z-10">
                    {emojis.map(e => (
                      <button key={e} onClick={() => { setInput(p => p + e); setShowEmojiPicker(null); inputRef.current?.focus(); }} className="text-base hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}
              </div>
              <motion.button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
                whileHover={{ scale: input.trim() ? 1.08 : 1 }}
                whileTap={{ scale: input.trim() ? 0.94 : 1 }}
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right info panel */}
        <div className="w-56 shrink-0 border-l border-surface-100 flex flex-col overflow-y-auto">
          {/* Profile section */}
          <div className="p-4 flex flex-col items-center text-center border-b border-surface-100">
            <div className="relative mb-3">
              <Avatar name={activeMember?.name ?? '—'} color={activeColor} size="xl" />
              {(() => { const s = activeMember?.status === 'active' ? 'online' : 'offline'; return <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: statusColor[s] }} />; })()}
            </div>
            <div className="font-bold text-gray-900 text-sm">{activeMember?.name ?? '—'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{activeMember?.designation ?? ''}</div>
            {(() => { const s = activeMember?.status === 'active' ? 'online' : 'offline'; return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-2 inline-block" style={{ backgroundColor: statusColor[s] + '20', color: statusColor[s] }}>{statusLabel[s]}</span>; })()}
          </div>

          {/* Quick actions */}
          <div className="p-4 border-b border-surface-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</div>
            {[
              { icon: Archive, label: 'Archive Chat', action: () => { setArchivedIds(p => { const next = new Set([...p, activeId]); const nextConv = conversations.find(m => !next.has(m.id) && m.id !== activeId); if (nextConv) setActiveId(nextConv.id); if (activeMember) { dbApi().setConvMeta({ userId: currentUserId, peerId: activeMember.id, pinned: pinnedIds.includes(activeMember.id), starred: starredIds.includes(activeMember.id), archived: true }).catch((err: unknown) => console.error('[MessagesPage] Failed to persist conv meta:', err)); } return next; }); } },
              { icon: Trash2, label: 'Clear Chat', action: () => {
                const msgs = chats[activeId] ?? [];
                msgs.forEach(m => dbApi().deleteMessage(m.id).catch((err: unknown) => console.error('[MessagesPage] Failed to delete message:', err)));
                setChats(p => ({ ...p, [activeId]: [] }));
              }},
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center gap-2.5 py-2 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg px-2 transition-colors"
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Shared stats */}
          <div className="p-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Conversation</div>
            {[
              ['Messages', activeChats.length],
              ['Files shared', activeChats.filter(m => m.text.startsWith('📎')).length],
              ['Links shared', activeChats.filter(m => /https?:\/\//.test(m.text)).length],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between text-xs py-1.5 border-b border-surface-100 last:border-0">
                <span className="text-gray-400">{label}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      )}

      {/* New Conversation modal — shown regardless of whether there are existing convos */}
      <AnimatePresence>
        {showNewConvo && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowNewConvo(false)}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden max-h-[70vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 shrink-0">
                <button onClick={() => setShowNewConvo(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                <span className="font-semibold text-sm text-gray-900">New Conversation</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {members.length === 0 && (
                  <div className="px-4 py-8 text-xs text-gray-400 text-center">
                    No team members yet. Invite members from the Members page first.
                  </div>
                )}
                {members.filter(m => m.id !== myId).map(m => (
                  <button key={m.id} onClick={() => {
                    setChats(prev => ({ ...prev, [m.id]: [] }));
                    setActiveId(m.id);
                    setShowNewConvo(false);
                  }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                    <Avatar name={m.name} color={getMemberColor(m.id)} size="md" />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-400">{m.designation ?? ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-click context menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            className="fixed bg-white rounded-xl shadow-card-hover border border-surface-100 py-1 z-50 w-40"
            style={{ top: showContextMenu.y, left: showContextMenu.x }}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            onClick={e => e.stopPropagation()}
          >
            {[
              { label: 'React', icon: Smile, action: () => { setShowEmojiPicker(showContextMenu.id); setShowContextMenu(null); } },
              { label: 'Delete', icon: Trash2, action: () => deleteMessage(showContextMenu.id), danger: true },
            ].map(({ label, icon: Icon, action, danger }) => (
              <button
                key={label}
                onClick={action}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${danger ? 'text-[#D8727D] hover:bg-[#D8727D0A]' : 'text-gray-700 hover:bg-surface-50'}`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MessagesPage;
