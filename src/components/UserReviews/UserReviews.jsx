import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const UserReviews = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Reviews</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
});

export default UserReviews;