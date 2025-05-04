"use client"

import { useState, useEffect } from "react"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type DocumentData,
  type QueryConstraint,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

interface FirestoreOptions {
  where?: [string, string, any][]
  orderBy?: [string, "asc" | "desc"][]
  limit?: number
}

export function useFirestore(collectionName: string) {
  // Add a document to a collection
  const addDocument = async (data: DocumentData) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
      })
      return { id: docRef.id, ...data }
    } catch (error) {
      console.error("Error adding document:", error)
      throw error
    }
  }

  // Get a document by ID
  const getDocument = async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      } else {
        return null
      }
    } catch (error) {
      console.error("Error getting document:", error)
      throw error
    }
  }

  // Get documents with optional filtering
  const getDocuments = async (options?: FirestoreOptions) => {
    try {
      const constraints: QueryConstraint[] = []

      if (options?.where) {
        options.where.forEach(([field, operator, value]) => {
          constraints.push(where(field, operator, value))
        })
      }

      if (options?.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          constraints.push(orderBy(field, direction))
        })
      }

      if (options?.limit) {
        constraints.push(limit(options.limit))
      }

      const q = query(collection(db, collectionName), ...constraints)
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error("Error getting documents:", error)
      throw error
    }
  }

  // Update a document
  const updateDocument = async (id: string, data: DocumentData) => {
    try {
      const docRef = doc(db, collectionName, id)
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      })
      return { id, ...data }
    } catch (error) {
      console.error("Error updating document:", error)
      throw error
    }
  }

  // Delete a document
  const deleteDocument = async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
      return true
    } catch (error) {
      console.error("Error deleting document:", error)
      throw error
    }
  }

  // Subscribe to a document
  const useDocument = (id: string) => {
    const [document, setDocument] = useState<DocumentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
      const docRef = doc(db, collectionName, id)
      const unsubscribe = onSnapshot(
        docRef,
        (doc) => {
          if (doc.exists()) {
            setDocument({ id: doc.id, ...doc.data() })
          } else {
            setDocument(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error("Error subscribing to document:", err)
          setError(err)
          setLoading(false)
        },
      )

      return () => unsubscribe()
    }, [id])

    return { document, loading, error }
  }

  // Subscribe to a collection
  const useCollection = (options?: FirestoreOptions) => {
    const [documents, setDocuments] = useState<DocumentData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
      const constraints: QueryConstraint[] = []

      if (options?.where) {
        options.where.forEach(([field, operator, value]) => {
          constraints.push(where(field, operator, value))
        })
      }

      if (options?.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          constraints.push(orderBy(field, direction))
        })
      }

      if (options?.limit) {
        constraints.push(limit(options.limit))
      }

      const q = query(collection(db, collectionName), ...constraints)

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setDocuments(docs)
          setLoading(false)
        },
        (err) => {
          console.error("Error subscribing to collection:", err)
          setError(err)
          setLoading(false)
        },
      )

      return () => unsubscribe()
    }, [JSON.stringify(options)])

    return { documents, loading, error }
  }

  return {
    addDocument,
    getDocument,
    getDocuments,
    updateDocument,
    deleteDocument,
    useDocument,
    useCollection,
  }
}
