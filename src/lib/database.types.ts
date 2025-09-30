export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export interface Database {
	public: {
		Tables: {
			events: {
				Row: {
					id: string;
					type: string;
					severity: number;
					location: string;
					description: string;
					event_timestamp: string;
					longitude: number | null;
					latitude: number | null;
					from_phone: string | null;
					images: string[] | null;
					source: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					type?: string;
					severity?: number;
					location?: string;
					description?: string;
					event_timestamp?: string;
					longitude?: number | null;
					latitude?: number | null;
					from_phone?: string | null;
					images?: string[] | null;
					source?: string | null;
					created_at?: string;
				};
				Update: Partial<Database['public']['Tables']['events']['Insert']>;
				Relationships: [];
			};
		};
		Functions: {};
		Enums: {};
		CompositeTypes: {};
	};
}
