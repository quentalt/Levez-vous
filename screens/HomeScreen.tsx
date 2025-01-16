import React, { useEffect, useState } from 'react';
import {View, FlatList, RefreshControl, Share, StyleSheet, ScrollView} from 'react-native';
import { Text, FAB, Card, useTheme, Chip, Searchbar, SegmentedButtons, IconButton, Menu, Portal, Dialog, Button, TextInput, Surface, Divider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { Strike, SortOption, Category, Comment } from '../types';

export function HomeScreen({ navigation }: any) {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [menuVisible, setMenuVisible] = useState<number | null>(null);
    const [commentDialogVisible, setCommentDialogVisible] = useState(false);
    const [selectedStrike, setSelectedStrike] = useState<Strike | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        fetchStrikes();
        fetchCategories();
    }, [showFavoritesOnly, selectedCategory]);

    async function fetchStrikes() {
        let query = supabase
            .from('strikes')
            .select('*, strike_categories(name)');

        if (selectedCategory) {
            query = query.eq('category_id', selectedCategory);
        }

        if (showFavoritesOnly) {
            query = query.eq('is_favorite', true);
        }

        const { data, error } = await query;

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

    async function fetchCategories() {
        const { data, error } = await supabase
            .from('strike_categories')
            .select('*')
            .order('name');

        if (!error && data) {
            setCategories(data);
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
        try {
            const { error } = await supabase
                .from('strikes')
                .update({
                    participants_count: strike.participants_count + 1
                })
                .eq('id', strike.id);

            if (error) {
                console.error('Error updating participants:', error);
            } else {
                await fetchStrikes();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchStrikes();
        setRefreshing(false);
    }, []);

    const fetchComments = async (strikeId: number) => {
        const { data, error } = await supabase
            .from('strike_comments')
            .select('*')
            .eq('strike_id', strikeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            setComments(data || []);
        }
    };

    const addComment = async () => {
        if (!selectedStrike || !newComment.trim()) return;

        const { error } = await supabase
            .from('strike_comments')
            .insert([{
                strike_id: selectedStrike.id,
                content: newComment.trim()
            }]);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setNewComment('');
            await fetchComments(selectedStrike.id);
        }
    };

    const handleShare = async (strike: Strike) => {
        try {
            const result = await Share.share({
                message: `Rejoignez la grève "${strike.title}" à ${strike.location} du ${new Date(strike.start_date).toLocaleDateString()} au ${new Date(strike.end_date).toLocaleDateString()}!`,
                title: strike.title,
            });

            if (result.action === Share.sharedAction) {
                const { error } = await supabase
                    .from('strikes')
                    .update({ shared_count: (strike.shared_count || 0) + 1 })
                    .eq('id', strike.id);

                if (!error) {
                    await fetchStrikes();
                }
            }
        } catch (error) {
            console.error('Error sharing strike:', error);
        }
    };

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
            case 'favorites':
                return (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
            default:
                return 0;
        }
    });

    const handleToggleFavorite = async (strike: Strike) => {
        try {
            const { error } = await supabase
                .from('strikes')
                .update({ is_favorite: !strike.is_favorite })
                .eq('id', strike.id);

            if (error) {
                console.error('Error toggling favorite:', error);
            } else {
                await fetchStrikes(); // Refresh the strikes list to update the favorite status
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Surface style={styles.header} elevation={2}>
                <Searchbar
                    placeholder="Rechercher des grèves..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <Chip
                        selected={selectedCategory === null}
                        onPress={() => setSelectedCategory(null)}
                        style={styles.categoryChip}
                    >
                        Toutes
                    </Chip>
                    {categories.map((category) => (
                        <Chip
                            key={category.id}
                            selected={selectedCategory === category.id}
                            onPress={() => setSelectedCategory(category.id)}
                            style={styles.categoryChip}
                        >
                            {category.name}
                        </Chip>
                    ))}
                </ScrollView>

                <SegmentedButtons
                    value={sortBy}
                    onValueChange={(value) => {
                        setSortBy(value);
                        setShowFavoritesOnly(value === 'favorites');
                    }}
                    buttons={[
                        { value: 'date', label: 'Date' },
                        { value: 'location', label: 'Lieu' },
                        { value: 'status', label: 'Statut' },
                        { value: 'participants', label: 'Populaire' },
                        { value: 'favorites', label: 'Favoris' },
                    ]}
                    style={styles.segmentedButtons}
                />
            </Surface>

            <FlatList
                data={sortedStrikes}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
                                <View style={styles.headerActions}>
                                    <IconButton
                                        icon={item.is_favorite ? "heart" : "heart-outline"}
                                        iconColor={item.is_favorite ? theme.colors.error : undefined}
                                        onPress={() => handleToggleFavorite(item)}
                                    />
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
                                            title="Modifier"
                                            leadingIcon="pencil"
                                        />
                                        <Menu.Item
                                            onPress={() => {
                                                setMenuVisible(null);
                                                handleShare(item);
                                            }}
                                            title="Partager"
                                            leadingIcon="share"
                                        />
                                        <Menu.Item
                                            onPress={() => {
                                                setMenuVisible(null);
                                                setSelectedStrike(item);
                                                setCommentDialogVisible(true);
                                                fetchComments(item.id);
                                            }}
                                            title="Commentaires"
                                            leadingIcon="comment"
                                        />
                                    </Menu>
                                </View>
                            </View>

                            <Chip
                                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                                textStyle={styles.statusText}
                            >
                                {item.status}
                            </Chip>

                            <View style={styles.chipContainer}>
                                <Chip icon="map-marker" style={styles.chip}>
                                    {item.location}
                                </Chip>
                                <Chip icon="calendar" style={styles.chip}>
                                    {new Date(item.start_date).toLocaleDateString()}
                                </Chip>
                                <Chip icon="calendar-end" style={styles.chip}>
                                    {new Date(item.end_date).toLocaleDateString()}
                                </Chip>
                                <Chip
                                    icon="account-group"
                                    onPress={() => handleParticipate(item)}
                                    style={styles.chip}
                                >
                                    {item.participants_count} participants
                                </Chip>
                                {item.category_id && (
                                    <Chip icon="tag" style={styles.chip}>
                                        {categories.find(c => c.id === item.category_id)?.name}
                                    </Chip>
                                )}
                            </View>

                            {item.description && (
                                <Text variant="bodyMedium" style={styles.description}>
                                    {item.description}
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                )}
            />

            <Portal>
                <Dialog visible={commentDialogVisible} onDismiss={() => setCommentDialogVisible(false)}>
                    <Dialog.Title>Commentaires</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Ajouter un commentaire"
                            value={newComment}
                            onChangeText={setNewComment}
                            mode="outlined"
                            multiline
                            style={styles.commentInput}
                        />
                        <Button mode="contained" onPress={addComment} style={styles.commentButton}>
                            Commenter
                        </Button>
                        <Divider style={styles.divider} />
                        {comments.map((comment) => (
                            <View key={comment.id} style={styles.comment}>
                                <Text style={styles.commentText}>{comment.content}</Text>
                                <Text style={styles.commentDate}>
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        ))}
                    </Dialog.Content>
                </Dialog>
            </Portal>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary}]}
                onPress={() => navigation.navigate('CreateStrike')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
    },
    searchbar: {
        marginBottom: 16,
    },
    categoryScroll: {
        marginBottom: 16,
    },
    categoryChip: {
        marginRight: 8,
    },
    segmentedButtons: {
        marginBottom: 8,
    },
    listContent: {
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        flex: 1,
        marginRight: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusChip: {
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    statusText: {
        color: 'white',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 8,
    },
    chip: {
        marginRight: 4,
        marginBottom: 4,
    },
    description: {
        marginTop: 12,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    commentInput: {
        marginBottom: 8,
    },
    commentButton: {
        marginBottom: 16,
    },
    divider: {
        marginVertical: 16,
    },
    comment: {
        marginBottom: 16,
    },
    commentText: {
        fontSize: 14,
        marginBottom: 4,
    },
    commentDate: {
        fontSize: 12,
        color: '#666',
    },
});