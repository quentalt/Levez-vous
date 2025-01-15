import React, { useState } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { TextInput, Button, HelperText, Snackbar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

export function CreateStrikeScreen({ navigation }: any) {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [participants, setParticipants] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const validateDates = () => {
        return endDate >= startDate;
    };

    const handleStartDateChange = (_: any, selectedDate: Date | undefined) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate);
        }
    };

    const handleEndDateChange = (_: any, selectedDate: Date | undefined) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    async function handleSubmit() {
        if (!title.trim()) {
            setError('Title is required');
            return;
        }
        if (!location.trim()) {
            setError('Location is required');
            return;
        }
        if (!validateDates()) {
            setError('End date must be after or equal to start date');
            return;
        }

        setLoading(true);
        setError('');

        const { error: submitError } = await supabase.from('strikes').insert([
            {
                title: title.trim(),
                location: location.trim(),
                description: description.trim(),
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                participants_count: parseInt(participants, 10),
            },
        ]);

        setLoading(false);

        if (submitError) {
            setError('Error creating strike. Please try again.');
            console.error('Error creating strike:', submitError);
        } else {
            setSnackbarVisible(true);
            setTimeout(() => {
                navigation.goBack();
            }, 1500);
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16 }}>
                <TextInput
                    label="Title"
                    value={title}
                    onChangeText={setTitle}
                    mode="outlined"
                    style={{ marginBottom: 16 }}
                    error={error === 'Title is required'}
                />
                <TextInput
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    mode="outlined"
                    style={{ marginBottom: 16 }}
                    error={error === 'Location is required'}
                />
                <TextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={{ marginBottom: 16 }}
                />
                <TextInput
                    label="Participants"
                    value={participants}
                    onChangeText={text => setParticipants(text)}
                    mode="outlined"
                    keyboardType="numeric"
                    style={{ marginBottom: 16 }}
                />

                <Button
                    mode="outlined"
                    onPress={() => setShowStartDatePicker(true)}
                    style={{ marginBottom: 16 }}
                >
                    Start Date: {formatDate(startDate)}
                </Button>

                <Button
                    mode="outlined"
                    onPress={() => setShowEndDatePicker(true)}
                    style={{ marginBottom: 16 }}
                >
                    End Date: {formatDate(endDate)}
                </Button>

                {(showStartDatePicker || Platform.OS === 'ios') && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleStartDateChange}
                    />
                )}

                {(showEndDatePicker || Platform.OS === 'ios') && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleEndDateChange}
                        minimumDate={startDate}
                    />
                )}

                {error ? (
                    <HelperText type="error" visible={!!error}>
                        {error}
                    </HelperText>
                ) : null}

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    style={{ marginTop: 16 }}
                >
                    Create Strike
                </Button>
            </ScrollView>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={2000}
            >
                Strike created successfully!
            </Snackbar>
        </View>
    );
}