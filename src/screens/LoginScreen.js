import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation, route, onClose }) => {
  const [isLogin, setIsLogin] = useState(route?.params?.initialMode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup, handleGoogleSignIn, error, loading } = useAuth();

  const handleGoogleSignInPress = useCallback(async () => {
    try {
      const session = await handleGoogleSignIn();
      if (session?.user) {
        if (onClose) {
          onClose();
        } else if (navigation) {
          navigation.goBack();
        }
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      Alert.alert(
        'Google Sign In Failed',
        err.message || 'Failed to sign in with Google. Please try again.'
      );
    }
  }, [handleGoogleSignIn, navigation, onClose]);

  const handleSubmit = useCallback(async () => {
    console.log('Submit pressed', { isLogin, email, password, name });
    
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        console.log('Attempting login...');
        const result = await login(email, password);
        console.log('Login result:', result);
        if (result?.error) {
          throw new Error(result.error);
        }
        if (onClose) {
          onClose();
        } else if (navigation) {
          navigation.goBack();
        }
      } else {
        console.log('Attempting signup...');
        const result = await signup(name, email, password);
        console.log('Signup result:', result);
        if (result?.error) {
          throw new Error(result.error);
        }
        Alert.alert('Success', 'Registration successful! Please sign in.');
        setIsLogin(true);
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Auth error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isLogin, email, password, name, login, signup, navigation, onClose]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (onClose) {
              onClose();
            } else if (navigation) {
              navigation.goBack();
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-down" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>
      </View>
      
      <View style={styles.content}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#000" />
                <Text style={styles.loadingText}>
                  {isLogin ? 'Signing In...' : 'Registering...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>{isLogin ? 'Sign In' : 'Register'}</Text>
            )}
          </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={[styles.googleButton, (isLoading || loading) && styles.buttonDisabled]}
          onPress={handleGoogleSignInPress}
          disabled={isLoading || loading}
        >
          <View style={styles.googleButtonContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#4285F4" />
                <Text style={[styles.googleButtonText, styles.loadingText]}>Signing in...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#999',
    fontSize: 14,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: '#222',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
  },
  googleButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default LoginScreen;
