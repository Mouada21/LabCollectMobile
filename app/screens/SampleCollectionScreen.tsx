import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import SearchableSelect from '../components/SearchableSelect';
import { ProductData, Sample, SampledData } from '../models/sample';
import { sampleService } from '../services/sampleService';
import { getImageSource } from '../utils/imageUtils';
import { isConnected } from '../utils/networkUtils';
import { generateUUID } from '../utils/uuidUtils';

interface SampleCollectionScreenProps {
  sampleId: string;
}

const SampleCollectionScreen: React.FC<SampleCollectionScreenProps> = ({ sampleId }) => {
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // State variables
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('info');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state for sample collection data
  const [samplingData, setSamplingData] = useState<SampledData>({
    products: [],
    samplingDateTime: new Date().toISOString(),
    storageTemperature: 'Ambient',
    storageCondition: 'Normal',
    remarks: ''
  });
  
  // Current product being edited
  const [currentProduct, setCurrentProduct] = useState<ProductData>({
    productName: '',
    category: '',
    clientReference: '',
    requestedAnalyses: [],
  });
  
  // Editing state
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  
  // Signature data
  const [signature, setSignature] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState('');
  
  // Photo capture data
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  // Location data
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Product catalog options
  const [catalog, setCatalog] = useState({
    categories: ['Municipal', 'Bottled', 'Industrial', 'Environmental', 'Other'],
    containerTypes: ['Plastic bottle', 'Glass vial', 'Sterile container', 'Vacuum tube'],
    storageTemperatures: ['Ambient', 'Refrigerated (2-8°C)', 'Frozen (-20°C)'],
    storageConditions: ['Normal', 'Dark', 'Airtight', 'Dry'],
    analyses: [
      'pH Test',
      'Bacterial Count',
      'Heavy Metals',
      'Pesticides',
      'Nitrates',
      'Hardness'
    ]
  });
  
  const [savingStep, setSavingStep] = useState<string | null>(null);
  
  // Progress tracking for form completion
  const [progress, setProgress] = useState({
    basicInfo: false,
    productAdded: false,
    locationCaptured: false,
    photoTaken: false,
    signatureCollected: false
  });
  
  // Effect hooks
  useEffect(() => {
    if (!sampleId) {
      Alert.alert(
        "Error", 
        "No sample ID provided", 
        [{ 
          text: "Go Back", 
          onPress: () => router.back()
        }]
      );
    } else {
      fetchSampleDetails();
      requestPermissions();
      loadCatalog();
      
      // Animate message container
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [sampleId, fadeAnim]);
  
  // Update progress when data changes
  useEffect(() => {
    updateProgress();
  }, [samplingData, location, signature, signedBy, photoUri]);
  
  const updateProgress = () => {
    setProgress({
      basicInfo: !!samplingData.containerType && !!samplingData.storageCondition,
      productAdded: samplingData.products.length > 0,
      locationCaptured: !!location,
      photoTaken: samplingData.products.some(p => p.photoUrl) || !!photoUri,
      signatureCollected: !!signature && !!signedBy
    });
  };
  
  const calculateProgressPercentage = () => {
    const total = Object.keys(progress).length;
    const completed = Object.values(progress).filter(value => value).length;
    return Math.round((completed / total) * 100);
  };
  
  // Core functionality methods
  const fetchSampleDetails = async () => {
    try {
      setLoading(true);
      const sampleData = await sampleService.getSampleById(sampleId);
      setSample(sampleData);
      
      // Initialize form with existing data
      if (sampleData.sampledData) {
        setSamplingData({
          ...sampleData.sampledData,
          // Ensure products is always an array
          products: sampleData.sampledData.products || []
        });
      }
    } catch (error) {
      console.error('Error fetching sample details:', error);
      Alert.alert('Error', 'Failed to load sample details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const requestPermissions = async () => {
    try {
      // Check if location services are enabled
      const providerStatus = await Location.getProviderStatusAsync();
      
      if (!providerStatus.locationServicesEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services in your device settings to capture sample location.",
          [{ text: "OK" }]
        );
        setHasPermission(false);
        return;
      }
      
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (locationStatus === 'granted') {
        setHasPermission(true);
        // Get current location
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          setLocation(location);
        } catch (locationError) {
          console.error('Error getting current location:', locationError);
          Alert.alert(
            "Location Error", 
            "Unable to retrieve current location. Sample will be saved without location data."
          );
        }
      } else {
        setHasPermission(false);
        Alert.alert(
          "Permission Required",
          "Location permission is needed to record where samples were collected.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
      Alert.alert("Permission Error", "Error accessing device permissions. Some features may be limited.");
    }
  };
  
  const retryLocationPermission = async () => {
    Alert.alert(
      "Location Required",
      "This app needs location access to record where samples were collected.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
        { text: "Try Again", onPress: () => requestPermissions() }
      ]
    );
  };
  
  const loadCatalog = async () => {
    try {
      console.log('Loading product catalog...');
      const productCatalog = await sampleService.getProductCatalog();
      console.log('Catalog loaded successfully');
      setCatalog(productCatalog);
    } catch (error) {
      console.error('Error loading product catalog:', error);
      // The default catalog will be used automatically by the service
    }
  };
  
  const handleSaveData = async () => {
    if (!sample) return;
    
    // Save current product if it has a name
    if (currentProduct.productName) {
      saveCurrentProduct();
    }
    
    // Check if we have at least one product
    if (samplingData.products?.length === 0) {
      Alert.alert('Error', 'Add at least one product before saving.');
      return;
    }
    
    try {
      setSaving(true);
      setSavingStep('Preparing data...');
      
      // Add location data if available
      if (location) {
        samplingData.gpsCoordinates = {
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
          accuracy: location.coords.accuracy?.toString() || 'unknown'
        };
      }
      
      const dataToSubmit = {
        ...samplingData,
        productName: samplingData.products[0]?.productName || null,
        category: samplingData.products[0]?.category || null,
        clientReference: samplingData.products[0]?.clientReference || null,
        requestedAnalyses: samplingData.products[0]?.requestedAnalyses || [],
        products: samplingData.products
      };
      
      setSavingStep('Uploading to server...');
      await sampleService.submitSamplingData(sampleId, dataToSubmit);
      
      setSavingStep('Refreshing data...');
      await fetchSampleDetails();
      
      // Show success message
      setSuccessMessage('Sample data saved successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
    } catch (error) {
      console.error('Error saving sample data:', error);
      Alert.alert('Error', 'Failed to save sample data. It will be saved locally and synchronized later.');
    } finally {
      setSaving(false);
      setSavingStep(null);
    }
  };
  
  const completeCollection = async () => {
    if (!signature || !signedBy.trim()) {
      Alert.alert('Error', 'Signature is required to complete collection');
      return;
    }

    try {
      setSaving(true);
      
      // First ensure sample data is saved
      await handleSaveData();
      
      // Submit signature and mark as collected
      await sampleService.completeSampleCollection(
        sampleId,
        {
          signedBy: signedBy,
          signatureImageBase64: signature
        },
        samplingData.remarks || ''
      );
      
      Alert.alert(
        'Success', 
        'Sample collection completed successfully!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/samples') }]
      );
    } catch (error) {
      console.error('Error completing sample collection:', error);
      
      // Check if it's just offline mode
      const networkAvailable = await isConnected();
      if (!networkAvailable) {
        Alert.alert(
          'Offline Collection Complete', 
          'Your sample has been marked as collected and will be synchronized when you\'re back online.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/samples') }]
        );
      } else {
        Alert.alert('Error', 'Failed to complete collection. Your data has been saved locally and will be synchronized later.');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDateTimePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setSamplingData({
        ...samplingData,
        samplingDateTime: selectedDate.toISOString()
      });
    }
  };
  
  // Signature handling
  const handleSignature = (signature: string) => {
    setSignature(signature);
    setShowSignaturePad(false);
    
    // Show success toast
    setSuccessMessage('Signature captured successfully');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };
  
  // Toggle analysis selection
  const toggleAnalysis = (analysis: string) => {
    // When editing a product, add analyses to the product
    if (editingProductIndex !== null || currentProduct.productName) {
      const currentAnalyses = currentProduct.requestedAnalyses || [];
      const updatedAnalyses = currentAnalyses.includes(analysis)
        ? currentAnalyses.filter(a => a !== analysis)
        : [...currentAnalyses, analysis];
      
      setCurrentProduct({
        ...currentProduct,
        requestedAnalyses: updatedAnalyses
      });
    } else {
      // Legacy support - store at the sample level with proper null checking
      const currentAnalyses = samplingData.requestedAnalyses || [];
      const updatedAnalyses = currentAnalyses.includes(analysis)
        ? currentAnalyses.filter(a => a !== analysis)
        : [...currentAnalyses, analysis];
      
      setSamplingData({
        ...samplingData,
        requestedAnalyses: updatedAnalyses
      });
    }
  };
  
  // Photo capture
  const takePicture = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take photos');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        setPhotoUri(photo.uri);
        setSamplingData({...samplingData, photoUrl: photo.uri});
        
        // Show success message
        setSuccessMessage('Photo captured successfully');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };
  
  // Product management functions
  const validateProduct = (product: ProductData): string | null => {
    if (!product.productName?.trim()) {
      return 'Product name is required';
    }
    return null; // No errors
  };

  const saveCurrentProduct = () => {
    const error = validateProduct(currentProduct);
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    
    // Continue with saving
    const updatedSamplingData = { 
      ...samplingData,
      // Ensure products array exists
      products: [...(samplingData.products || [])]
    };
    
    if (editingProductIndex !== null && updatedSamplingData.products[editingProductIndex]) {
      // Update existing product
      updatedSamplingData.products[editingProductIndex] = { 
        ...currentProduct,
        photoUrl: photoUri || currentProduct.photoUrl 
      };
    } else {
      // Add new product with guaranteed ID
      const productWithStorage = { 
        ...currentProduct,
        id: generateUUID(),
        photoUrl: photoUri || undefined,
        // Add these from the main form if not already set
        storageTemperature: currentProduct.storageTemperature || samplingData.storageTemperature,
        storageCondition: currentProduct.storageCondition || samplingData.storageCondition,
        containerType: currentProduct.containerType || samplingData.containerType
      };
      
      updatedSamplingData.products.push(productWithStorage);
    }
    
    setSamplingData(updatedSamplingData);
    
    // Reset current product and photo
    setCurrentProduct({
      productName: '',
      category: '',
      clientReference: '',
      requestedAnalyses: [],
    });
    setPhotoUri(null);
    setEditingProductIndex(null);
    
    // Show success message
    setSuccessMessage(editingProductIndex !== null ? 'Product updated' : 'Product added');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    
    // Set active section to products list
    setActiveSection('products');
    
    // Scroll to products section
    setTimeout(() => {
      scrollToSection('products');
    }, 300);
  };

  const editProduct = (index: number) => {
    const product = samplingData.products[index];
    setCurrentProduct({ ...product });
    setPhotoUri(product.photoUrl || null);
    setEditingProductIndex(index);
    
    // Set active section to product form
    setActiveSection('info');
    
    // Scroll to product form
    setTimeout(() => {
      scrollToSection('info');
    }, 300);
  };

  const removeProduct = (index: number) => {
    Alert.alert(
      'Remove Product',
      'Are you sure you want to remove this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedProducts = [...samplingData.products];
            updatedProducts.splice(index, 1);
            setSamplingData({ ...samplingData, products: updatedProducts });
            
            // Show success message
            setSuccessMessage('Product removed');
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
          }
        }
      ]
    );
  };
  
  // Helper functions
  const scrollToSection = (sectionId: string) => {
    const sectionMap: {[key: string]: number} = {
      'info': 0,
      'products': 1,
      'details': 2,
      'location': 3,
      'signature': 4
    };
    
    // Each section is roughly a certain percentage down the scroll view
    // This is an approximation and might need adjustment based on actual layout
    if (scrollViewRef.current) {
      const screenHeight = 700; // Approximation
      const offset = sectionMap[sectionId] * screenHeight * 0.4;
      scrollViewRef.current.scrollTo({ y: offset, animated: true });
    }
  };
  
  const isSectionActive = (sectionId: string) => {
    return activeSection === sectionId;
  };
  
  const toggleSection = (sectionId: string) => {
    if (activeSection === sectionId) {
      setActiveSection('');
    } else {
      setActiveSection(sectionId);
      scrollToSection(sectionId);
    }
  };
  
  // Signature pad component
  if (showSignaturePad) {
    return (
      <View style={styles.signatureContainer}>
        <Text style={styles.signatureTitle}>Please sign below to complete collection</Text>
        
        <SignatureScreen
          onOK={handleSignature}
          onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
          descriptionText="Sign above"
          clearText="Clear"
          confirmText="Save"
          webStyle={`.m-signature-pad--footer
            { display: flex; justify-content: space-between; }
            .m-signature-pad--footer .button {
              background-color: #4169E1;
              color: white;
              padding: 10px 16px;
              border-radius: 8px;
              font-weight: bold;
            }`}
        />
        
        <TouchableOpacity 
          style={styles.signatureCloseButton} 
          onPress={() => setShowSignaturePad(false)}
        >
          <Text style={styles.signatureCloseText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading sample details...</Text>
      </View>
    );
  }
  
  // Main render
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header with progress bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.sampleTitle}>Sample Collection</Text>
            <Text style={styles.sampleCode}>{sample?.sampleCode || 'Loading...'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.statusText}>IN PROGRESS</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${calculateProgressPercentage()}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{calculateProgressPercentage()}% Complete</Text>
        </View>
      </View>
      
      {/* Success Toast Message */}
      {showSuccessMessage && (
        <Animated.View 
          style={[
            styles.successToast,
            { opacity: fadeAnim }
          ]}
        >
          <Icon name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.successToastText}>{successMessage}</Text>
        </Animated.View>
      )}
      
      {/* Main content */}
      <ScrollView 
        style={styles.scrollView}
        ref={scrollViewRef}
      >
        {/* Client Information */}
        <View style={styles.clientCard}>
          <Icon name="office-building" size={24} color="#4169E1" style={styles.clientIcon} />
          <View style={styles.clientInfo}>
            <Text style={styles.clientLabel}>Client</Text>
            <Text style={styles.clientName}>{sample?.client?.name || 'Unknown Client'}</Text>
          </View>
        </View>
        
        {/* Products List */}
        <SectionHeader 
          title={`Products (${samplingData.products.length})`}
          icon="package-variant-closed"
          isActive={isSectionActive('products')}
          onPress={() => toggleSection('products')}
          badge={samplingData.products.length}
        />
        
        {isSectionActive('products') && (
          <View style={styles.sectionContent}>
            {samplingData.products.length > 0 ? (
              samplingData.products.map((product, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.productName}</Text>
                    <View style={styles.productActions}>
                      <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={() => editProduct(index)}
                      >
                        <Icon name="pencil" size={16} color="#4169E1" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.iconButton, { marginLeft: 8 }]} 
                        onPress={() => removeProduct(index)}
                      >
                        <Icon name="trash-can-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.productDetail}>Category: {product.category || 'Not specified'}</Text>
                  {product.requestedAnalyses && product.requestedAnalyses.length > 0 && (
                    <Text style={styles.productDetail}>
                      Analyses: {product.requestedAnalyses.join(', ')}
                    </Text>
                  )}
                  
                  {product.photoUrl && (
                    <Image 
                      source={{ uri: product.photoUrl }} 
                      style={styles.productThumbnail}
                      resizeMode="cover"
                    />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="beaker-question-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No products added yet</Text>
                <Text style={styles.emptyStateSubText}>
                  Add your first product using the form below
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.addNewButton}
              onPress={() => {
                setCurrentProduct({
                  productName: '',
                  category: '',
                  clientReference: '',
                  requestedAnalyses: [],
                });
                setEditingProductIndex(null);
                setPhotoUri(null);
                setActiveSection('info');
                scrollToSection('info');
              }}
            >
              <Icon name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addNewButtonText}>Add New Product</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Product Information Form */}
        <SectionHeader 
          title={editingProductIndex !== null ? 'Edit Product' : 'New Product Details'}
          icon="flask-outline"
          isActive={isSectionActive('info')}
          onPress={() => toggleSection('info')}
        />
        
        {isSectionActive('info') && (
          <View style={styles.sectionContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={currentProduct.productName}
                onChangeText={(value) => setCurrentProduct({...currentProduct, productName: value})}
                placeholder="Enter product name (e.g., Drinking Water)"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentProduct.category}
                  style={styles.picker}
                  onValueChange={(value: string) => setCurrentProduct({...currentProduct, category: value})}
                >
                  <Picker.Item label="Select a category" value="" />
                  {catalog.categories.map((category, index) => (
                    <Picker.Item key={index} label={category} value={category} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Reference</Text>
              <TextInput
                style={styles.input}
                value={currentProduct.clientReference}
                onChangeText={(value) => setCurrentProduct({...currentProduct, clientReference: value})}
                placeholder="Enter client reference number"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Sampling Date & Time</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDateTimePicker(true)}
              >
                <Text>
                  {new Date(samplingData.samplingDateTime || Date.now()).toLocaleString()}
                </Text>
                <Icon name="calendar" size={20} color="#4169E1" />
              </TouchableOpacity>
              
              {showDateTimePicker && (
                <DateTimePicker
                  value={new Date(samplingData.samplingDateTime || Date.now())}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? "spinner" : "default"}
                  onChange={handleDateChange}
                />
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {editingProductIndex !== null || currentProduct.productName ? 
                  'Product Analyses' : 
                  'Requested Analyses'
                }
              </Text>
              
              <SearchableSelect
                placeholder="Search or add analyses..."
                options={catalog.analyses}
                selectedValues={
                  (editingProductIndex !== null || currentProduct.productName)
                    ? (currentProduct.requestedAnalyses || [])
                    : (samplingData.requestedAnalyses || [])
                }
                onSelectionChange={(selected) => {
                  if (editingProductIndex !== null || currentProduct.productName) {
                    setCurrentProduct({
                      ...currentProduct,
                      requestedAnalyses: selected
                    });
                  } else {
                    setSamplingData({
                      ...samplingData,
                      requestedAnalyses: selected
                    });
                  }
                }}
                allowCustomValues={true}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Sample Photo</Text>
              
              {photoUri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity 
                    style={styles.retakeButton}
                    onPress={takePicture}
                  >
                    <Icon name="camera" size={16} color="#4169E1" />
                    <Text style={styles.retakeButtonText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.photoButton}
                  onPress={takePicture}
                >
                  <Icon name="camera" size={24} color="#4169E1" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {currentProduct.productName && (
              <TouchableOpacity 
                style={styles.saveItemButton}
                onPress={saveCurrentProduct}
              >
                <Icon name={editingProductIndex !== null ? 'content-save' : 'plus-circle'} size={18} color="#FFFFFF" />
                <Text style={styles.saveItemButtonText}>
                  {editingProductIndex !== null ? 'Update Product' : 'Add Product'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Collection Details */}
        <SectionHeader 
          title="Collection Details" 
          icon="beaker-outline"
          isActive={isSectionActive('details')}
          onPress={() => toggleSection('details')}
        />
        
        {isSectionActive('details') && (
          <View style={styles.sectionContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Storage Temperature</Text>
              <SearchableSelect
                placeholder="Select or enter temperature..."
                options={catalog.storageTemperatures}
                selectedValues={samplingData.storageTemperature ? [samplingData.storageTemperature] : []}
                onSelectionChange={(selected) => setSamplingData({
                  ...samplingData,
                  storageTemperature: selected.length > 0 ? selected[0] : undefined
                })}
                allowCustomValues={true}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Storage Condition</Text>
              <SearchableSelect
                placeholder="Select or enter condition..."
                options={catalog.storageConditions}
                selectedValues={samplingData.storageCondition ? [samplingData.storageCondition] : []}
                onSelectionChange={(selected) => setSamplingData({
                  ...samplingData,
                  storageCondition: selected.length > 0 ? selected[0] : undefined
                })}
                allowCustomValues={true}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Container Type</Text>
              <SearchableSelect
                placeholder="Select or enter container type..."
                options={catalog.containerTypes}
                selectedValues={samplingData.containerType ? [samplingData.containerType] : []}
                onSelectionChange={(selected) => setSamplingData({
                  ...samplingData,
                  containerType: selected.length > 0 ? selected[0] : undefined
                })}
                allowCustomValues={true}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Barcode (if applicable)</Text>
              <TextInput
                style={styles.input}
                value={samplingData.barcode}
                onChangeText={(value) => setSamplingData({...samplingData, barcode: value})}
                placeholder="Enter barcode or scan"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Remarks / Observations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={samplingData.remarks}
                onChangeText={(value) => setSamplingData({...samplingData, remarks: value})}
                placeholder="Enter any additional remarks"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
        
        {/* Location Information */}
        <SectionHeader 
          title="Location Information" 
          icon="map-marker"
          isActive={isSectionActive('location')}
          onPress={() => toggleSection('location')}
          completed={!!location}
        />
        
        {isSectionActive('location') && (
          <View style={styles.sectionContent}>
            <View style={styles.locationContainer}>
              {location ? (
                <View style={styles.locationInfo}>
                  <View style={styles.coordRow}>
                    <Icon name="latitude" size={18} color="#4169E1" />
                    <Text style={styles.coordinates}>
                      Latitude: {location.coords.latitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.coordRow}>
                    <Icon name="longitude" size={18} color="#4169E1" />
                    <Text style={styles.coordinates}>
                      Longitude: {location.coords.longitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.coordRow}>
                    <Icon name="crosshairs-gps" size={18} color="#4169E1" />
                    <Text style={styles.coordinates}>
                      Accuracy: {location.coords.accuracy ? `±${location.coords.accuracy.toFixed(1)}m` : 'Unknown'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.refreshLocationButton}
                    onPress={requestPermissions}
                  >
                    <Icon name="refresh" size={16} color="#4169E1" />
                    <Text style={styles.refreshLocationText}>Refresh Location</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.locationMissingContainer}>
                  <Icon name="map-marker-off" size={32} color="#EF4444" style={styles.noLocationIcon} />
                  <Text style={styles.locationMissing}>
                    Location data unavailable. Please ensure location services are enabled.
                  </Text>
                  <TouchableOpacity 
                    style={styles.enableLocationButton}
                    onPress={retryLocationPermission}
                  >
                    <Icon name="crosshairs-gps" size={16} color="#FFFFFF" />
                    <Text style={styles.enableLocationText}>Enable Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Signature and Completion */}
        <SectionHeader 
          title="Signature" 
          icon="draw"
          isActive={isSectionActive('signature')}
          onPress={() => toggleSection('signature')}
          completed={!!signature && !!signedBy}
        />
        
        {isSectionActive('signature') && (
          <View style={styles.sectionContent}>
            {/* First check if we have an existing signature from the backend */}
            {sample?.sampledData?.signature ? (
              <View style={styles.signaturePreviewContainer}>
                <Text style={styles.signatureLabel}>Collected Signature</Text>
                <Image 
                  source={getImageSource(sample.sampledData.signature.signatureImageUrl) || { uri: '' }}
                  style={styles.signaturePreview}
                  resizeMode="contain"
                />
                <Text style={styles.signedByText}>
                  Signed by: {sample.sampledData.signature.signedBy}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Signed By</Text>
                  <TextInput
                    style={styles.input}
                    value={signedBy}
                    onChangeText={setSignedBy}
                    placeholder="Enter name of person signing"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  {signature ? (
                    <View style={styles.signaturePreviewContainer}>
                      <Text style={styles.signatureLabel}>Signature Preview</Text>
                      <Image
                        source={{ uri: signature }}
                        style={styles.signaturePreview}
                        resizeMode="contain"
                      />
                      <TouchableOpacity 
                        style={styles.retakeButton}
                        onPress={() => setShowSignaturePad(true)}
                      >
                        <Icon name="draw" size={16} color="#4169E1" />
                        <Text style={styles.retakeButtonText}>Redo Signature</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.signatureButton}
                      onPress={() => setShowSignaturePad(true)}
                    >
                      <Icon name="draw" size={24} color="#4169E1" />
                      <Text style={styles.signatureButtonText}>Capture Signature</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || !samplingData.products?.length) && styles.disabledButton]}
            onPress={handleSaveData}
            disabled={saving || !samplingData.products?.length}
          >
            {saving && savingStep === 'Preparing data...' ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Preparing...</Text>
              </>
            ) : saving && savingStep === 'Uploading to server...' ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Uploading...</Text>
              </>
            ) : saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Icon name="content-save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Data</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.completeButton,
              (!signature || !signedBy || !samplingData.products?.length) && styles.disabledButton
            ]}
            onPress={completeCollection}
            disabled={saving || !signature || !signedBy || !samplingData.products?.length}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Complete Collection</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Section Header Component
const SectionHeader = ({ 
  title, 
  icon, 
  isActive, 
  onPress, 
  badge = null,
  completed = false 
}: { 
  title: string; 
  icon: string; 
  isActive: boolean; 
  onPress: () => void;
  badge?: number | null;
  completed?: boolean;
}) => (
  <TouchableOpacity 
    style={[
      styles.sectionHeader, 
      isActive && styles.activeSectionHeader
    ]} 
    onPress={onPress}
  >
    <View style={styles.sectionHeaderLeft}>
      <Icon name={icon as any} size={20} color={isActive ? '#4169E1' : '#6B7280'} />
      <Text style={[
        styles.sectionHeaderTitle, 
        isActive && styles.activeSectionHeaderTitle
      ]}>
        {title}
      </Text>
      {badge !== null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <View style={styles.sectionHeaderRight}>
      {completed && (
        <Icon name="check-circle" size={20} color="#10B981" style={styles.completedIcon} />
      )}
      <Icon 
        name={isActive ? 'chevron-up' : 'chevron-down'} 
        size={20} 
        color={isActive ? '#4169E1' : '#6B7280'} 
      />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#4169E1',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  sampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sampleCode: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  clientCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  clientIcon: {
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  activeSectionHeader: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginLeft: 12,
  },
  activeSectionHeaderTitle: {
    color: '#4169E1',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIcon: {
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 2,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#4169E1',
    marginLeft: 8,
  },
  photoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retakeButtonText: {
    color: '#4169E1',
    fontSize: 14,
    marginLeft: 6,
  },
  locationContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 16,
  },
  locationInfo: {
    alignItems: 'flex-start',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'center',
  },
  refreshLocationText: {
    color: '#4169E1',
    fontSize: 14,
    marginLeft: 6,
  },
  locationMissingContainer: {
    alignItems: 'center',
  },
  noLocationIcon: {
    marginBottom: 8,
  },
  locationMissing: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  enableLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
  },
  signatureButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureButtonText: {
    fontSize: 16,
    color: '#4169E1',
    marginLeft: 8,
  },
  signaturePreviewContainer: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  signatureLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  signaturePreview: {
    width: '100%',
    height: 120,
    marginBottom: 8,
  },
  signedByText: {
    fontSize: 14,
    color: '#111827',
    marginTop: 8,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'column',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    height: 40,
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
  productCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  productActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 4,
  },
  productDetail: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  productThumbnail: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  addNewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  saveItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 16,
  },
  saveItemButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  signatureContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginVertical: 16,
  },
  signatureCloseButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
  },
  signatureCloseText: {
    color: '#4169E1',
    fontSize: 16,
  },
  successToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 90,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default SampleCollectionScreen;