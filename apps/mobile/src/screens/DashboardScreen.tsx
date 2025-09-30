import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { apiService } from '../services/api';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClaims: 0,
    rejectionRate: 0,
    recoveryRate: 0,
    pendingLetters: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b6cb8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardValue}>{stats.totalClaims}</Title>
            <Paragraph style={styles.cardLabel}>المطالبات الشهرية</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardValue}>{stats.rejectionRate}%</Title>
            <Paragraph style={styles.cardLabel}>نسبة المرفوضات</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardValue}>{stats.recoveryRate}%</Title>
            <Paragraph style={styles.cardLabel}>نسبة الاسترداد</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardValue}>{stats.pendingLetters}</Title>
            <Paragraph style={styles.cardLabel}>الخطابات المعلقة</Paragraph>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2b6cb8',
  },
  cardLabel: {
    fontSize: 14,
    color: '#888888',
  },
});