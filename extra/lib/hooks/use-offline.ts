"use client"

import { useState, useEffect } from "react"

interface OfflineStorage {
  getItem: (key: string) => Promise<any>
  setItem: (key: string, value: any) => Promise<void>
  removeItem: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
  isOnline: boolean
  syncQueue: any[]
  addToSyncQueue: (operation: any) => Promise<void>
  processSyncQueue: () => Promise<void>
}

export function useOffline(): OfflineStorage {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [syncQueue, setSyncQueue] = useState<any[]>([])
  const [dbPromise, setDbPromise] = useState<IDBDatabase | null>(null)

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open("GaitRehabOfflineDB", 1)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create stores
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data")
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })
      }
    }

    request.onsuccess = (event) => {
      setDbPromise((event.target as IDBOpenDBRequest).result)

      // Load sync queue
      getFromStore("syncQueue").then((queue) => {
        if (queue) {
          setSyncQueue(queue)
        }
      })
    }

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error)
    }

    // Online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true)
      processSyncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Helper function to perform operations on IndexedDB stores
  const getStore = (storeName: string, mode: IDBTransactionMode = "readonly"): IDBObjectStore | null => {
    if (!dbPromise) return null
    const transaction = dbPromise.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  // Get all items from a store
  const getFromStore = (storeName: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const store = getStore(storeName)
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Get item from IndexedDB
  const getItem = (key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const store = getStore("data")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Set item in IndexedDB
  const setItem = (key: string, value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      const store = getStore("data", "readwrite")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.put(value, key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Remove item from IndexedDB
  const removeItem = (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const store = getStore("data", "readwrite")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.delete(key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Clear all items from IndexedDB
  const clear = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const store = getStore("data", "readwrite")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Get all keys from IndexedDB
  const keys = (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const store = getStore("data")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.getAllKeys()

      request.onsuccess = () => {
        resolve(request.result as string[])
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Add operation to sync queue
  const addToSyncQueue = async (operation: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      const store = getStore("syncQueue", "readwrite")
      if (!store) {
        reject(new Error("Store not available"))
        return
      }

      const request = store.add({
        ...operation,
        timestamp: new Date().toISOString(),
      })

      request.onsuccess = () => {
        // Update local sync queue state
        setSyncQueue((prev) => [...prev, operation])
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  // Process sync queue when online
  const processSyncQueue = async (): Promise<void> => {
    if (!isOnline || syncQueue.length === 0) return

    // Process each operation in the queue
    for (const operation of syncQueue) {
      try {
        // Here you would implement the actual sync logic
        // For example, sending data to your API
        console.log("Processing sync operation:", operation)

        // After successful sync, remove from queue
        const store = getStore("syncQueue", "readwrite")
        if (store) {
          store.delete(operation.id)
        }
      } catch (error) {
        console.error("Error processing sync operation:", error)
        // Keep in queue to retry later
        break
      }
    }

    // Update sync queue state
    const remainingQueue = await getFromStore("syncQueue")
    setSyncQueue(remainingQueue || [])
  }

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    keys,
    isOnline,
    syncQueue,
    addToSyncQueue,
    processSyncQueue,
  }
}
