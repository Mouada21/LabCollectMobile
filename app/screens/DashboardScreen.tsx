import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import RoleBasedAccessControl from '../components/RoleBasedAccessControl';
import { useAuth } from '../contexts/AuthContext';
import { DashboardData, RecentActivity, Sample, SampleStatus } from '../models/sample';
import { sampleService } from '../services/sampleService';

const DashboardScreen = () => {
  const { auth } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSamples, setPendingSamples] = useState<Sample[]>([]);
  const [urgentSamples, setUrgentSamples] = useState<Sample[]>([]);
  
  // Check auth status and redirect if needed
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.loading) {
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.loading]);
  
  const fetchDashboardData = useCallback(async (showFullLoader = true) => {
    try {
      if (showFullLoader) setLoading(true);
      
      // Get dashboard statistics
      const dashboardResult = await sampleService.getDashboardData();
      setDashboardData(dashboardResult);
      
      // Get all assigned samples
      const samples = await sampleService.getAssignedSamples();
      setRecentSamples(samples.slice(0, 5));
      
      // Filter for pending samples (requires collection)
      const pending = samples.filter(s => s.status === SampleStatus.PLANNED);
      setPendingSamples(pending);
      
      // Get urgent samples (due within 24 hours)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const urgent = samples.filter(s => {
        const dueDate = new Date(s.missionDate);
        return dueDate <= tomorrow && s.status === SampleStatus.PLANNED;
      });
      setUrgentSamples(urgent);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(false);
  }, [fetchDashboardData]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const getStatusColor = (status: SampleStatus) => {
    switch(status) {
      case SampleStatus.COMPLETED: return '#10B981';
      case SampleStatus.PLANNED: return '#F59E0B';
      case SampleStatus.IN_PROGRESS: return '#3B82F6';
      case SampleStatus.COLLECTED: return '#8B5CF6';
      case SampleStatus.IN_LAB: return '#EC4899';
      case SampleStatus.ANALYZED: return '#6366F1';
      case SampleStatus.CANCELLED: return '#EF4444';
      default: return '#6B7280';
    }
  };
  
  const getStatusIcon = (status: SampleStatus) => {
    switch(status) {
      case SampleStatus.COMPLETED: return 'check-circle';
      case SampleStatus.PLANNED: return 'calendar-clock';
      case SampleStatus.IN_PROGRESS: return 'progress-clock';
      case SampleStatus.COLLECTED: return 'flask-outline';
      case SampleStatus.IN_LAB: return 'flask';
      case SampleStatus.ANALYZED: return 'chart-bar';
      case SampleStatus.CANCELLED: return 'close-circle';
      default: return 'help-circle';
    }
  };
  
  const renderActivityItem = ({ item }: { item: RecentActivity }) => (
    <TouchableOpacity 
      style={styles.activityItem}
      onPress={() => router.push(`/(tabs)/[...sample]?sampleId=${item.sampleId}`)}
    >
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activitySampleCode}>{item.sampleCode}</Text>
        <Text style={styles.activityClient}>{item.client}</Text>
        <Text style={styles.activityTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <View style={styles.activityStatus}>
        <Icon name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} style={styles.statusIcon} />
        <Text style={[styles.statusText, {color: getStatusColor(item.status)}]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
  
  const renderUrgentItem = ({ item }: { item: Sample }) => {
    const dueDate = new Date(item.missionDate);
    const today = new Date();
    const diffTime = Math.abs(dueDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return (
      <TouchableOpacity 
        style={styles.urgentItem}
        onPress={() => router.push(`/(tabs)/[...sample]?sampleId=${item.id}`)}
      >
        <Icon name="alert-circle" size={20} color="#EF4444" />
        <View style={styles.urgentContent}>
          <Text style={styles.urgentCode}>{item.sampleCode}</Text>
          <Text style={styles.urgentClient}>{item.client.name}</Text>
        </View>
        <View style={styles.urgentTimeContainer}>
          <Text style={styles.urgentTimeLabel}>Due in</Text>
          <View style={styles.urgentTime}>
            <Text style={styles.urgentTimeText}>{diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderPendingItem = ({ item }: { item: Sample }) => (
    <TouchableOpacity 
      style={styles.pendingItem}
      onPress={() => router.push(`/(tabs)/[...sample]?sampleId=${item.id}`)}
    >
      <Icon 
        name="flask-outline" 
        size={20} 
        color="#F59E0B" 
        style={styles.pendingIcon}
      />
      <View style={styles.pendingContent}>
        <Text style={styles.pendingCode}>{item.sampleCode}</Text>
        <Text style={styles.pendingClient}>{item.client.name}</Text>
      </View>
      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => router.push(`/(tabs)/collect?sampleId=${item.id}`)}
      >
        <Text style={styles.startButtonText}>Start</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  // Prepare chart data if dashboard data is available
  const getChartData = () => {
    if (!dashboardData) return [];
    
    return [
      {
        name: 'Pending',
        population: dashboardData.pendingCollection,
        color: '#F59E0B',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'In Progress',
        population: dashboardData.inProgress,
        color: '#3B82F6',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Collected',
        population: dashboardData.collected,
        color: '#8B5CF6',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'In Lab',
        population: dashboardData.inLab,
        color: '#EC4899',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getTodaysDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4169E1']}
            tintColor="#4169E1"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeText}>
                Hello, {auth.userName || 'User'}
              </Text>
              <Text style={styles.dateText}>{getTodaysDate()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/screens/profile')}
            >
              <Icon name="account" size={24} color="#4169E1" />
            </TouchableOpacity>
          </View>
        </View>
        
        {!dashboardData ? (
          <View style={styles.emptyContainer}>
            <Icon name="chart-bar" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No dashboard data available</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => fetchDashboardData()}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick Actions */}
            <View style={styles.quickActionContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/(tabs)/samples')}
                >
                  <View style={[styles.actionIcon, {backgroundColor: '#E6F0FF'}]}>
                    <Icon name="format-list-bulleted" size={24} color="#4169E1" />
                  </View>
                  <Text style={styles.actionText}>All Samples</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/screens/new-sample')}
                >
                  <View style={[styles.actionIcon, {backgroundColor: '#FFF7E6'}]}>
                    <Icon name="plus-circle" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.actionText}>Create Sample</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/screens/map-view')}
                >
                  <View style={[styles.actionIcon, {backgroundColor: '#E6FFEE'}]}>
                    <Icon name="map-marker" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.actionText}>Map View</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => router.push('/screens/scan-barcode')}
                >
                  <View style={[styles.actionIcon, {backgroundColor: '#F3E8FF'}]}>
                    <Icon name="barcode-scan" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.actionText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Sample Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.sectionTitle}>Sample Summary</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{dashboardData.totalSamples}</Text>
                    <Text style={styles.statLabel}>Total Samples</Text>
                  </View>
                  <View style={[styles.statCard, {borderLeftColor: '#F59E0B', borderLeftWidth: 3}]}>
                    <Text style={[styles.statNumber, {color: '#F59E0B'}]}>{dashboardData.pendingCollection}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, {borderLeftColor: '#8B5CF6', borderLeftWidth: 3}]}>
                    <Text style={[styles.statNumber, {color: '#8B5CF6'}]}>{dashboardData.collected}</Text>
                    <Text style={styles.statLabel}>Collected</Text>
                  </View>
                  <View style={[styles.statCard, {borderLeftColor: '#3B82F6', borderLeftWidth: 3}]}>
                    <Text style={[styles.statNumber, {color: '#3B82F6'}]}>{dashboardData.inProgress}</Text>
                    <Text style={styles.statLabel}>In Progress</Text>
                  </View>
                </View>
              </View>
              
              {/* Chart visualization */}
              {dashboardData?.totalSamples > 0 && (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={getChartData()}
                    width={Dimensions.get('window').width - 32}
                    height={180}
                    chartConfig={{
                      backgroundColor: '#FFFFFF',
                      backgroundGradientFrom: '#FFFFFF',
                      backgroundGradientTo: '#FFFFFF',
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              )}
            </View>
            
            {/* Urgent Samples */}
            {urgentSamples.length > 0 && (
              <View style={styles.urgentContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWrapper}>
                    <Icon name="alert-circle" size={20} color="#EF4444" style={styles.sectionIcon} />
                    <Text style={[styles.sectionTitle, {color: '#EF4444'}]}>Urgent Samples</Text>
                  </View>
                  <Text style={styles.sectionCount}>{urgentSamples.length}</Text>
                </View>
                
                <FlatList
                  data={urgentSamples.slice(0, 3)}
                  renderItem={renderUrgentItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
                
                {urgentSamples.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewMoreButton}
                    onPress={() => router.push('/(tabs)/samples?filter=urgent')}
                  >
                    <Text style={styles.viewMoreText}>View All {urgentSamples.length} Urgent Samples</Text>
                    <Icon name="chevron-right" size={16} color="#4169E1" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Pending Collection */}
            {pendingSamples.length > 0 && (
              <View style={styles.pendingContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWrapper}>
                    <Icon name="flask-outline" size={20} color="#F59E0B" style={styles.sectionIcon} />
                    <Text style={[styles.sectionTitle, {color: '#F59E0B'}]}>Pending Collection</Text>
                  </View>
                  <Text style={styles.sectionCount}>{pendingSamples.length}</Text>
                </View>
                
                <FlatList
                  data={pendingSamples.slice(0, 3)}
                  renderItem={renderPendingItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
                
                {pendingSamples.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewMoreButton}
                    onPress={() => router.push('/(tabs)/samples?filter=pending')}
                  >
                    <Text style={styles.viewMoreText}>View All {pendingSamples.length} Pending Samples</Text>
                    <Icon name="chevron-right" size={16} color="#4169E1" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Recent Activity */}
            <View style={styles.activityContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrapper}>
                  <Icon name="clock-outline" size={20} color="#4B5563" style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/(tabs)/samples')}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {dashboardData.recentActivity.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <Text style={styles.emptyActivityText}>No recent activity</Text>
                </View>
              ) : (
                <FlatList
                  data={dashboardData.recentActivity}
                  renderItem={renderActivityItem}
                  keyExtractor={(item) => item.sampleId + item.timestamp}
                  scrollEnabled={false}
                />
              )}
            </View>
            
            {/* Bottom padding */}
            <View style={{height: 80}} />
          </>
        )}
      </ScrollView>
      
      <RoleBasedAccessControl requiredRoles={['SAMPLER']}>
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/screens/new-sample')}
          >
            <Icon name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </RoleBasedAccessControl>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 24,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4169E1',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActionContainer: {
    padding: 16,
    marginBottom: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  summaryContainer: {
    padding: 16,
    marginBottom: 16,
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4169E1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  urgentContainer: {
    padding: 16,
    marginBottom: 16,
  },
  urgentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  urgentContent: {
    flex: 1,
    paddingLeft: 12,
  },
  urgentCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  urgentClient: {
    fontSize: 12,
    color: '#4B5563',
  },
  urgentTimeContainer: {
    alignItems: 'center',
  },
  urgentTimeLabel: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  urgentTime: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgentTimeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pendingContainer: {
    padding: 16,
    marginBottom: 16,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pendingIcon: {
    marginRight: 4,
  },
  pendingContent: {
    flex: 1,
    paddingLeft: 8,
  },
  pendingCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  pendingClient: {
    fontSize: 12,
    color: '#4B5563',
  },
  startButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#4169E1',
    marginRight: 4,
  },
  activityContainer: {
    padding: 16,
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4169E1',
  },
  emptyActivity: {
    padding: 20,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activitySampleCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  activityClient: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default DashboardScreen;