import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TermsConditionsModal = ({ visible, onClose }) => {
  const [termsData, setTermsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTermsConditions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://www.beatinbox.com/api/terms-of-service');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTermsData(data);
    } catch (error) {
      console.error('Error fetching terms & conditions:', error);
      setError('Failed to load terms & conditions. Please try again.');
      Alert.alert('Error', 'Failed to load terms & conditions. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && !termsData) {
      fetchTermsConditions();
    }
  }, [visible]);

  const renderSection = (section) => (
    <View key={section.id} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionContent}>{section.content}</Text>
      
      {section.items && section.items.length > 0 && (
        <View style={styles.itemsContainer}>
          {section.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {termsData?.title || 'Terms & Conditions'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading Terms & Conditions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchTermsConditions} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : termsData ? (
            <>
              {/* Last Updated */}
              {termsData.lastUpdated && (
                <View style={styles.lastUpdatedContainer}>
                  <Text style={styles.lastUpdatedText}>
                    Last Updated: {termsData.lastUpdated}
                  </Text>
                </View>
              )}

              {/* Important Notice */}
              <View style={styles.noticeContainer}>
                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                <Text style={styles.noticeText}>
                  Please read these terms carefully. By using BeatinBox, you agree to be bound by these terms.
                </Text>
              </View>

              {/* Sections */}
              {termsData.sections?.map(renderSection)}

              {/* Footer Spacing */}
              <View style={styles.footerSpacing} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdatedContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  lastUpdatedText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    padding: 16,
    marginBottom: 24,
    borderRadius: 8,
  },
  noticeText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 16,
  },
  itemsContainer: {
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#4CAF50',
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#ddd',
    lineHeight: 22,
  },
  footerSpacing: {
    height: 40,
  },
});

export default TermsConditionsModal; 