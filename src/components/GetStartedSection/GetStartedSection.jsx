import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GetStartedSection = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get Started Section</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
});

export default GetStartedSection;