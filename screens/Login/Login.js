import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, SafeAreaView, View } from 'react-native';
import { Input, Layout, Button, Text, Spinner } from '@ui-kitten/components';
import authService from 'services/auth/authService';
import ios from 'utilities/isIos';
const isIos = ios();

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordInput = useRef(null);

  useEffect(() => {
    setErrorText('');
  }, [username, password]);

  const handleLoginPress = async () => {
    if (username.length === 0) {
      setErrorText('Missing Username!');
    } else if (password.length === 0) {
      setErrorText('Missing Password!');
    } else {
      setErrorText('');
      setIsLoading(true);
      const response = await authService.loginWithPassword(username, password);
      if (response.error) {
        setIsLoading(false);
        setErrorText(response.message);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={isIos ? 'padding' : 'null'} keyboardVerticalOffset={50}>
        <Layout style={{ flex: 1, paddingHorizontal: 30, justifyContent: 'center' }}>
          <Text category="h4" style={{ textAlign: 'center', marginBottom: 30 }}>
            Chat.
          </Text>
          <Input
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current.focus()}
            autoCapitalize="none"
            placeholder="Username"
            onChangeText={setUsername}
          />
          <Input
            autoCapitalize="none"
            returnKeyType="go"
            ref={passwordInput}
            placeholder="Password"
            onChangeText={setPassword}
            secureTextEntry
            style={{ marginTop: 3 }}
          />
          <View style={{ marginTop: 15 }}>
            {isLoading ? (
              <Layout
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 58,
                  borderRadius: 50,
                }}
              >
                <Spinner status="basic" />
              </Layout>
            ) : (
              <Button onPress={handleLoginPress} size="medium" style={{ borderRadius: 6 }}>
                Log in!
              </Button>
            )}
          </View>
          {errorText.length > 0 && (
            <Text status="danger" style={{ textAlign: 'center', marginTop: 15 }}>
              Something went wrong... {errorText}
            </Text>
          )}
        </Layout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
