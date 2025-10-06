/**
 * BrainSAIT Teams Integration - Conversation Reference Storage
 * MongoDB-based storage for Teams conversation references
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { ConversationReference } from '@microsoft/agents-activity';

export interface PagedData<T> {
  data: T[];
  continuationToken?: string;
}

export interface IConversationReferenceStore {
  add(key: string, reference: Partial<ConversationReference>): Promise<void>;
  list(pageSize?: number, continuationToken?: string): Promise<PagedData<Partial<ConversationReference>>>;
  delete(keys: string[]): Promise<void>;
}

export class MongoConversationStore implements IConversationReferenceStore {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection | null = null;
  private readonly dbName: string = 'brainsait_rcm';
  private readonly collectionName: string = 'teams_conversations';

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      
      // Create index on key for fast lookups
      await this.collection.createIndex({ key: 1 }, { unique: true });
    }
  }

  async add(key: string, reference: Partial<ConversationReference>): Promise<void> {
    await this.connect();
    
    if (!this.collection) {
      throw new Error('Database collection not initialized');
    }

    await this.collection.updateOne(
      { key },
      {
        $set: {
          key,
          reference,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async list(
    pageSize: number = 50,
    continuationToken?: string
  ): Promise<PagedData<Partial<ConversationReference>>> {
    await this.connect();

    if (!this.collection) {
      throw new Error('Database collection not initialized');
    }

    const query = continuationToken ? { _id: { $gt: continuationToken } } : {};
    
    const documents = await this.collection
      .find(query)
      .limit(pageSize + 1)
      .toArray();

    const hasMore = documents.length > pageSize;
    const data = hasMore ? documents.slice(0, pageSize) : documents;
    
    const references = data.map(doc => doc.reference as Partial<ConversationReference>);
    const nextToken = hasMore ? documents[pageSize]._id.toString() : undefined;

    return {
      data: references,
      continuationToken: nextToken,
    };
  }

  async delete(keys: string[]): Promise<void> {
    await this.connect();

    if (!this.collection) {
      throw new Error('Database collection not initialized');
    }

    await this.collection.deleteMany({
      key: { $in: keys },
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.db = null;
      this.collection = null;
    }
  }
}

/**
 * Generate a unique key for a conversation reference
 */
export function getConversationReferenceKey(
  reference: Partial<ConversationReference>
): string {
  const conversationId = reference.conversation?.id;
  if (!conversationId) {
    throw new Error('Conversation ID is required for generating key');
  }
  return conversationId;
}
