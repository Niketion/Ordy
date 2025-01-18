// components/Greeting.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return <Text style={styles.greeting}>Ciao, {name}!</Text>;
};

const styles = StyleSheet.create({
  greeting: {
    fontSize: 20,
    color: '#555',
  },
});

export default Greeting;
