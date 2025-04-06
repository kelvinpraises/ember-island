"use client";

import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { useRef, useCallback } from "react";

export type ActivityEvent = {
  eventType: string;
  id: number;
  eventTime: number;
  playerId: number;
  villageId: number;
  description: string;
  player: {
    id: number;
    pfp: string;
    username: string;
  };
};

type ActivityResult = {
  data: {
    events: {
      items: ActivityEvent[];
    };
  };
};

const EVENT_QUERY = `
query MyQuery {
    events(limit: 300, orderDirection: "desc", orderBy: "eventTime") {
      items {
        id
        eventType
        eventTime
        description
        playerId
        villageId
        player {
          id
          pfp
          username
        }
      }
    }
  }`;

const EVENT_QUERY_VILLAGE = (tokenId: string) => `
query MyQuery {
    events(limit: 100, orderDirection: "desc", orderBy: "eventTime", where: { villageIdsInvolved_has: "${tokenId}"}) {
      items {
        id
        eventType
        eventTime
        description
        playerId
        villageId
        player {
          id
          pfp
          username
        }
      }
    }
  }`;

export function useActivityFeed(villageId?: string | undefined) {
  // Keep a reference to all events we've seen so far
  const allEventsRef = useRef<ActivityEvent[]>([]);
  
  // Callback to merge and deduplicate events
  const mergeEvents = useCallback((newEvents: ActivityEvent[] | undefined) => {
    if (!newEvents) return allEventsRef.current;
    
    // Use a Map to deduplicate by ID
    const eventMap = new Map<number, ActivityEvent>();
    
    // Add existing events to map
    allEventsRef.current.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Add new events, overwriting any with the same ID
    newEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Convert back to array and sort by eventTime (newest first)
    const merged = Array.from(eventMap.values()).sort((a, b) => b.eventTime - a.eventTime);
    
    // Update our ref with the merged list
    allEventsRef.current = merged;
    
    return merged;
  }, []);

  const { data, error, mutate: originalMutate, isLoading } = useSWR<ActivityResult, any>(
    villageId ? EVENT_QUERY_VILLAGE(villageId) : EVENT_QUERY,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 10000, // Auto-refresh every 10 seconds
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Deduplicate requests within 5 seconds
      onSuccess: (data) => {
        // When we get new data, merge it with existing events
        mergeEvents(data?.data?.events?.items);
      }
    }
  );
  
  // Custom mutate function that preserves our events
  const mutate = useCallback(async (data?: any, options?: any) => {
    return originalMutate(data, {
      ...options,
      populateCache: (result: ActivityResult, currentData: ActivityResult) => {
        // If we have a result, merge its events with our existing ones
        if (result?.data?.events?.items) {
          const merged = mergeEvents(result.data.events.items);
          
          // Return updated data
          return {
            ...result,
            data: {
              ...result.data,
              events: {
                ...result.data.events,
                items: merged
              }
            }
          };
        }
        return result;
      }
    });
  }, [originalMutate, mergeEvents]);

  return {
    // Use our accumulated events instead of just the latest response
    events: allEventsRef.current.length > 0 ? allEventsRef.current : data?.data?.events?.items,
    isLoading,
    isError: error,
    mutate,
  };
}
