import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text, FAB, Card, useTheme, Chip, Searchbar, SegmentedButtons, IconButton, Menu } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { Strike, SortOption } from '../types';

export function HomeScreen({ navigation }: any) {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const theme = useTheme();
    const [menuVisible, setMenuVisible] = useState<number | null>(null);

    useEffect(() => {
        fetchStrikes();
    }, []);

    async function fetchStrikes() {
        const { data, error } = await supabase
            .from('strikes')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching strikes:', error);
        } else {
            const strikesWithStatus = data?.map(strike => ({
                ...strike,
                status: getStrikeStatus(strike.start_date, strike.end_date),
            })) || [];
            setStrikes(strikesWithStatus);
        }
    }

    const getStrikeStatus = (startDate: string, endDate: string): Strike['status'] => {
        const now = new Date();
        const strikeStart = new Date(startDate);
        const strikeEnd = new Date(endDate);

        if (now < strikeStart) return 'upcoming';
        if (now >= strikeStart && now <= strikeEnd) return 'ongoing';
        return 'completed';
    };

    const getStatusColor = (status: Strike['status']) => {
        switch (status) {
            case 'upcoming': return theme.colors.primary;
            case 'ongoing': return '#4CAF50';
            case 'completed': return theme.colors.secondary;
        }
    };

    const handleParticipate = async (strike: Strike) => {
        const { error } = await supabase
            .from('strikes')
            .update({ participants_count: strike.participants_count + 1 })
            .eq('id', strike.id);

        if (!error) {
            await fetchStrikes();
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchStrikes();
        setRefreshing(false);
    }, []);

    const filteredStrikes = strikes.filter(strike =>
        strike.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        strike.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedStrikes = [...filteredStrikes].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            case 'location':
                return a.location.localeCompare(b.location);
            case 'status':
                return a.status.localeCompare(b.status);
            case 'participants':
                return b.participants_count - a.participants_count;
            default:
                return 0;
        }
    });

    return (
        <View style={{ flex: 1 }}>
            <Searchbar
                placeholder="Search strikes..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={{ margin: 16 }}
            />
            <SegmentedButtons
                value={sortBy}
                onValueChange={setSortBy}
                buttons={[
                    { value: 'date', label: 'Date' },
                    { value: 'location', label: 'Location' },
                    { value: 'status', label: 'Status' },
                    { value: 'participants', label: 'Popular' },
                ]}
                style={{ marginHorizontal: 16, marginBottom: 16 }}
            />
            <FlatList
                data={sortedStrikes}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => (
                    <Card style={{ marginBottom: 16 }}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text variant="titleLarge" style={{ flex: 1 }}>{item.title}</Text>
                                <Menu
                                    visible={menuVisible === item.id}
                                    onDismiss={() => setMenuVisible(null)}
                                    anchor={
                                        <IconButton
                                            icon="dots-vertical"
                                            onPress={() => setMenuVisible(item.id)}
                                        />
                                    }
                                >
                                    <Menu.Item
                                        onPress={() => {
                                            setMenuVisible(null);
                                            navigation.navigate('EditStrike', { strike: item });
                                        }}
                                        title="Edit"
                                        leadingIcon="pencil"
                                    />
                                </Menu>
                                <Chip
                                    style={{ backgroundColor: getStatusColor(item.status) }}
                                    textStyle={{ color: 'white' }}
                                >
                                    {item.status}
                                </Chip>
                            </View>
                            <View style={{ flexDirection: 'row', marginVertical: 8, flexWrap: 'wrap', gap: 8 }}>
                                <Chip icon="map-marker">
                                    {item.location}
                                </Chip>
                                <Chip icon="calendar">
                                    {new Date(item.start_date).toLocaleDateString()}
                                </Chip>
                                <Chip icon="calendar-end">
                                    {new Date(item.end_date).toLocaleDateString()}
                                </Chip>
                                <Chip
                                    icon="account-group"
                                    onPress={() => handleParticipate(item)}
                                >
                                    {item.participants_count} participants
                                </Chip>
                            </View>
                            {item.description && (
                                <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                                    {item.description}
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                )}
            />
            <FAB
                icon="plus"
                style={{
                    position: 'absolute',
                    margin: 16,
                    right: 0,
                    bottom: 0,
                    backgroundColor: theme.colors.primary,
                }}
                onPress={() => navigation.navigate('CreateStrike')}
            />
        </View>
    );
}