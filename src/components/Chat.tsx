'use client';

import { useEffect, useState, useRef } from 'react';
import { Realtime, RealtimeChannel } from 'ably';

type Message = { user: string; text: string; color?: string };

export default function Chat() {
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatChannel, setChatChannel] = useState<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // إنشاء اتصال Ably مرة واحدة فقط عند تحميل الصفحة
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) return;

    const defaultClientId = 'Anonymous_' + Math.floor(Math.random() * 1000);
    const realtime = new Realtime({ key: apiKey, clientId: defaultClientId });
    const channel = realtime.channels.get('chat-room');
    setChatChannel(channel);

    // دخول Presence افتراضي
    channel.presence.enter({ username: defaultClientId });

    // الاشتراك بالرسائل
    channel.subscribe('message', (msg) => {
      const m = msg.data as Message;
      if (!m.color) m.color = getColor(m.user);
      setMessages((prev) => [...prev, m]);
    });

    // إدارة الأونلاين
    const handleEnter = (member: { clientId: string }) =>
      setOnlineUsers((prev) => Array.from(new Set([...prev, member.clientId])));
    const handleLeave = (member: { clientId: string }) =>
      setOnlineUsers((prev) => prev.filter((u) => u !== member.clientId));

    channel.presence.subscribe('enter', handleEnter);
    channel.presence.subscribe('leave', handleLeave);

    return () => {
      channel.unsubscribe();
      channel.presence.leave();
      realtime.close();
    };
  }, []);

  // تحديث Presence عند تغيير الاسم
  useEffect(() => {
    if (!username.trim() || !chatChannel) return;

    // اترك الاسم القديم وادخل بالاسم الجديد
    chatChannel.presence.leave();
    chatChannel.presence.enter(username);
  }, [username, chatChannel]);

  const sendMessage = () => {
    if (!chatChannel || !input.trim() || !username.trim()) return;

    const message: Message = { user: username, text: input, color: getColor(username) };
    chatChannel.publish('message', message);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-opacity-20"></div>
        <div className="flex items-center relative z-10">
          <div className="w-10 h-10 bg-white bg-opacity-30 rounded-full flex items-center justify-center mr-4 shadow-lg">
            💬
          </div>
          <div className="text-3xl font-extrabold">Welcome to Alaa&apos;s Chat App</div>
        </div>
        <div className="text-sm bg-green-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg border-2 border-green-600 relative z-10">
          Online: {onlineUsers.length}
        </div>
      </div>

      {/* Name input */}
      <div className="p-4 flex justify-center items-center bg-white shadow">
        <input
          type="text"
          placeholder="Enter your name..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full max-w-md p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
          autoFocus
        />
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col bg-gray-50">
        {messages.map((msg, index) => {
          const isMe = msg.user === username;
          return (
            <div key={index} className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: msg.color }}>
                  {getInitials(msg.user)}
                </div>
              )}
              <div className="flex flex-col max-w-xs">
                {!isMe && <div className="text-xs text-gray-600 mb-1 ml-1">{msg.user}</div>}
                <div
                  className={`px-4 py-2 rounded-2xl shadow-md break-words ${
                    isMe
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
              {isMe && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white text-xs font-bold">
                  {getInitials(username)}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="flex p-4 bg-white shadow-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-4 rounded-full bg-gray-50 border-2 border-gray-200 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all duration-300 shadow-sm hover:shadow-md"
        />
        <button
          onClick={sendMessage}
          className="ml-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          Send
        </button>
      </div>
    </div>
  );
}
