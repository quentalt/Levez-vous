export interface Strike {
    id: number;
    title: string;
    description: string;
    location: string;
    start_date: string;
    end_date: string;
    created_at: string;
    status: 'upcoming' | 'ongoing' | 'completed';
    participants_count: number;
    category_id?: number;
    shared_count: number;
    is_favorite?: boolean;
}

export interface Category {
    id: number;
    name: string;
    created_at: string;
}

export interface Comment {
    id: number;
    strike_id: number;
    user_id: string;
    content: string;
    created_at: string;
}

export interface Participant {
    id: number;
    strike_id: number;
    user_id: string;
    created_at: string;
}

export type SortOption = 'date' | 'location' | 'status' | 'participants' | 'favorites';