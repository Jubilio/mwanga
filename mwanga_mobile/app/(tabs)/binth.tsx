import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/constants/api';

export default function BinthScreen() {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', text: 'Olá! Sou a Binth, sua assistente financeira. Como posso ajudar você hoje?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Call the existing backend endpoint for Binth chat
      const resp = await api.post('/ai/chat', { message: userMsg.text });
      
      const assistantMsg = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: resp.data.reply || 'Desculpe, tive um problema ao processar sua solicitação.' 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        text: 'Não consegui conectar ao servidor. Verifique sua conexão.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.role === 'user' ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.avatar, item.role === 'user' ? styles.userAvatar : styles.assistantAvatar]}>
        {item.role === 'user' ? <Ionicons name="person-outline" size={16} color="#fff" /> : <Ionicons name="hardware-chip-outline" size={16} color="#000" />}
      </View>
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <ThemedText style={styles.messageText}>{item.text}</ThemedText>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['#fcc419', '#ff922b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <Ionicons name="sparkles-outline" size={20} color="#000" />
            <ThemedText style={styles.headerTitle}>Binth AI Assistant</ThemedText>
          </LinearGradient>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#fcc419" />
            <ThemedText style={styles.loadingText}>Binth está pensando...</ThemedText>
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Pergunte algo sobre seus gastos..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading || !inputText.trim()}>
            <Ionicons name="send-outline" size={20} color={inputText.trim() ? '#fcc419' : '#444'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 15,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    gap: 10,
  },
  headerTitle: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  chatList: {
    padding: 20,
    gap: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    maxWidth: '85%',
    gap: 10,
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: '#339af0',
  },
  assistantAvatar: {
    backgroundColor: '#fcc419',
  },
  bubble: {
    padding: 15,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#1a1a1a',
    borderTopRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#222',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#eee',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 62,
    marginBottom: 10,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#0a0a0a',
  },
  input: {
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 15,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
