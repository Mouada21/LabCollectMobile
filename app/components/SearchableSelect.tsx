import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SearchableSelectProps {
  placeholder: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (selected: string[]) => void;
  allowCustomValues?: boolean;
}

const SearchableSelect = ({
  placeholder,
  options,
  selectedValues,
  onSelectionChange,
  allowCustomValues = false,
}: SearchableSelectProps) => {
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredOptions = searchText
    ? options.filter(option => 
        option.toLowerCase().includes(searchText.toLowerCase()) &&
        !selectedValues.includes(option))
    : [];

  const handleSelect = (option: string) => {
    onSelectionChange([...selectedValues, option]);
    setSearchText('');
    setShowDropdown(false);
  };

  const handleAddCustom = () => {
    if (searchText && !selectedValues.includes(searchText)) {
      onSelectionChange([...selectedValues, searchText]);
      setSearchText('');
    }
  };

  const handleRemove = (value: string) => {
    onSelectionChange(selectedValues.filter(v => v !== value));
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);
          setShowDropdown(!!text);
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
      
      {showDropdown && filteredOptions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
            {filteredOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.option}
                onPress={() => handleSelect(option)}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showDropdown && filteredOptions.length === 0 && searchText && allowCustomValues && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.option}
            onPress={handleAddCustom}
          >
            <Text>Add "{searchText}"</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.tagsContainer}>
        {selectedValues.map((value, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{value}</Text>
            <TouchableOpacity onPress={() => handleRemove(value)}>
              <Icon name="close-circle" size={16} color="#4B5563" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginTop: 4,
    zIndex: 1000,
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#EBF4FF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#4169E1',
    marginRight: 4,
    fontSize: 14,
  },
});

export default SearchableSelect;