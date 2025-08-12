import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createPlaylist } from '../services/api';

const CreatePlaylistModal = ({ onClose, onSuccess }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    setIsCreating(true);
    try {
      await createPlaylist(playlistName);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#000']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>New playlist</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Enter playlist name"
          placeholderTextColor="#666"
          value={playlistName}
          onChangeText={setPlaylistName}
          onSubmitEditing={handleCreate}
          autoFocus={true}
        />
        
        <TouchableOpacity 
          style={[styles.createButton, !playlistName.trim() && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!playlistName.trim() || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16
  },
  content: {
    padding: 20
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20
  },
  createButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  createButtonDisabled: {
    backgroundColor: '#1a472a'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default CreatePlaylistModal;
