import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  RefreshControl,
  StyleSheet, 
  Text, 
  TextInput,
  TouchableOpacity, 
  View 
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Sample as ApiSample } from '../models/sample';
import { sampleService } from '../services/sampleService';

// Local Sample interface that matches what the component expects
interface Sample {
  id: string;
  name: string;
  status: string;
  dueDate: string;
  clientName: string;
}

const SamplesScreen = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Fetch samples from API and map to our format
  const fetchSamples = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setLoading(true);
      setError(null);
      console.log('Fetching samples...');
      
      const apiSamples = await sampleService.getAssignedSamples();
      console.log('Samples fetched:', apiSamples.length);
      
      if (apiSamples.length > 0) {
        // Map API data to the format this component expects
        const mappedSamples: Sample[] = apiSamples.map((sample: ApiSample) => ({
          id: sample.id,
          name: sample.sampleCode,
          status: sample.status,
          dueDate: sample.missionDate,
          clientName: sample.client?.name || 'Unknown Client'
        }));
        
        console.log('Mapped samples:', mappedSamples.length);
        setSamples(mappedSamples);
        setFilteredSamples(mappedSamples);
      } else {
        setSamples([]);
        setFilteredSamples([]);
      }
    } catch (error) {
      console.error('Error fetching samples:', error);
      setError('Failed to load samples. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSamples(false);
  }, [fetchSamples]);
  
  // Initial load
  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);
  
  // Filter samples based on search query
  useEffect(() => {
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = samples.filter(
        sample => 
          sample.name.toLowerCase().includes(lowercaseQuery) ||
          sample.clientName.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredSamples(filtered);
    } else {
      setFilteredSamples(samples);
    }
  }, [searchQuery, samples]);
  
  // Status color and icon mapping
  const getStatusDetails = (status: string) => {
    const statusMap: Record<string, { color: string; icon: string; label: string }> = {
      'completed': { color: '#10B981', icon: 'check-circle', label: 'Completed' },
      'planned': { color: '#F59E0B', icon: 'calendar-clock', label: 'Planned' },
      'in_progress': { color: '#3B82F6', icon: 'progress-clock', label: 'In Progress' },
      'collected': { color: '#8B5CF6', icon: 'flask-outline', label: 'Collected' },
      'in_lab': { color: '#EC4899', icon: 'flask', label: 'In Lab' },
      'analyzed': { color: '#6366F1', icon: 'chart-bar', label: 'Analyzed' },
      'cancelled': { color: '#EF4444', icon: 'close-circle', label: 'Cancelled' },
    };
    
    const defaultStatus = { color: '#6B7280', icon: 'help-circle', label: status };
    return statusMap[status.toLowerCase()] || defaultStatus;
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Render a sample card
  const renderSampleCard = ({ item, index }: { item: Sample; index: number }) => {
    const statusDetails = getStatusDetails(item.status);
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
        <TouchableOpacity
          style={styles.sampleCard}
          onPress={() => router.push(`/(tabs)/[...sample]?sampleId=${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.sampleName}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
                <Icon name={statusDetails.icon as any} size={12} color="#FFFFFF" />
                <Text style={styles.statusText}>{statusDetails.label}</Text>
              </View>
            </View>
            
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Icon name="office-building" size={16} color="#4B5563" />
                <Text style={styles.clientName}>{item.clientName}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Icon name="calendar" size={16} color="#4B5563" />
                <Text style={styles.dueDate}>Due: {formatDate(item.dueDate)}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.cardAction}>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Render the screen
  return (
    <View style={styles.container}>
      {/* Header with search */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search samples..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {loading ? 'Loading samples...' : `${filteredSamples.length} Samples`}
          </Text>
        </View>
      </Animated.View>
      
      {/* Main content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading samples...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchSamples()}>
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSamples.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="flask-empty-outline" size={60} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No samples found matching your search' : 'No samples found'}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchSamples()}>
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSamples}
          keyExtractor={(item) => item.id}
          renderItem={renderSampleCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#4169E1']}
              tintColor="#4169E1"
            />
          }
        />
      )}
      
      {/* Floating Action Button */}
      {!loading && !error && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/screens/new-sample')}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1F2937',
  },
  headerInfo: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginVertical: 12,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBody: {
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sampleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  clientName: {
    fontSize: 14,
    color: '#4B5563',
  },
  dueDate: {
    fontSize: 14,
    color: '#4B5563',
  },
  cardAction: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default SamplesScreen;