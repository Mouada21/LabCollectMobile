import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import RoleBasedAccessControl from '../components/RoleBasedAccessControl';
import { Sample, SampleStatus } from '../models/sample';
import { sampleService } from '../services/sampleService';

interface SampleDetailProps {
  sampleId: string;
}

const SampleDetailScreen: React.FC<SampleDetailProps> = ({ sampleId }) => {
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    fetchSampleDetails();
  }, [sampleId]);
  
  const fetchSampleDetails = async () => {
    try {
      setLoading(true);
      const sampleData = await sampleService.getSampleById(sampleId);
      setSample(sampleData);
    } catch (error) {
      console.error('Error fetching sample details:', error);
      Alert.alert('Error', 'Failed to load sample details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const startSampling = async () => {
    if (!sample) return;
    
    try {
      setUpdating(true);
      
      // Update the sample status to IN_PROGRESS
      const updatedSample = await sampleService.updateSampleStatus(
        sample.id, 
        SampleStatus.IN_PROGRESS
      );
      
      setSample(updatedSample);
      Alert.alert('Success', 'Sampling process has been started.');
    } catch (error) {
      console.error('Error starting sampling:', error);
      Alert.alert('Error', 'Failed to start sampling. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const getStatusColor = (status: SampleStatus | undefined) => {
    if (!status) return '#6B7280';
    
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
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading sample details...</Text>
      </View>
    );
  }
  
  if (!sample) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#EF4444" />
        <Text style={styles.errorText}>Sample not found</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSampleDetails}
        >
          <Text style={styles.refreshButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sample.status) }]}>
          <Text style={styles.statusText}>{sample.status}</Text>
        </View>
        <Text style={styles.sampleCode}>{sample.sampleCode}</Text>
        <Text style={styles.clientName}>{sample.client.name}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sample Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sample ID</Text>
            <Text style={styles.infoValue}>{sample.id}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mission Date</Text>
            <Text style={styles.infoValue}>{formatDate(sample.missionDate)}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created At</Text>
            <Text style={styles.infoValue}>{formatDate(sample.createdAt)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client Name</Text>
            <Text style={styles.infoValue}>{sample.client.name}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Person</Text>
            <Text style={styles.infoValue}>{sample.client.contactPerson || 'N/A'}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Email</Text>
            <Text style={styles.infoValue}>{sample.client.contactEmail || 'N/A'}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Phone</Text>
            <Text style={styles.infoValue}>{sample.client.contactPhone || 'N/A'}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>
              {[
                sample.client.address,
                sample.client.city,
                sample.client.state,
                sample.client.postalCode,
                sample.client.country
              ].filter(Boolean).join(', ') || 'N/A'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sampler Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{sample.sampler.fullName}</Text>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{sample.sampler.email || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      {sample.sampledData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sampled Data</Text>
          <View style={styles.infoCard}>
            {/* Display sampled data fields here */}
            <Text style={styles.noDataText}>Sampling data available.</Text>
          </View>
        </View>
      )}
      
      {sample.results && sample.results.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          <View style={styles.infoCard}>
            {/* Display results here */}
            <Text style={styles.noDataText}>Results available.</Text>
          </View>
        </View>
      ) : null}
      
      <RoleBasedAccessControl requiredRoles={['SAMPLER']}>
        {sample.status === SampleStatus.PLANNED && (
          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={startSampling}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="flask" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Start Sampling</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {sample.status === SampleStatus.PLANNED && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/(tabs)/sample-collection?sampleId=${sample.id}`)}
          >
            <Icon name="flask" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Collect Sample</Text>
          </TouchableOpacity>
        )}
        
        {sample.status === SampleStatus.IN_PROGRESS && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/(tabs)/sample-collection?sampleId=${sample.id}`)}
          >
            <Icon name="flask-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Continue Collection</Text>
          </TouchableOpacity>
        )}
      </RoleBasedAccessControl>
      
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sampleCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 16,
    color: '#4B5563',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  noDataText: {
    fontSize: 15,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionsSection: {
    padding: 16,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    height: 40,
  },
});

export default SampleDetailScreen;
