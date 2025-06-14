/* eslint react-hooks/exhaustive-deps: 1 */
import * as React from 'react'
import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { FaceLandmarker as FaceLandmarkerImpl } from '@mediapipe/tasks-vision'
import type { FaceLandmarkerOptions } from '@mediapipe/tasks-vision'
import { clear, suspend } from 'suspend-react'

const FaceLandmarkerContext = createContext({} as FaceLandmarkerImpl | undefined)

type FaceLandmarkerProps = {
  basePath?: string
  options?: FaceLandmarkerOptions
  children?: ReactNode
}

export const FaceLandmarkerDefaults = {
  basePath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
  options: {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true
  } as FaceLandmarkerOptions
}

export function FaceLandmarker({ basePath = FaceLandmarkerDefaults.basePath, options = FaceLandmarkerDefaults.options, children }: FaceLandmarkerProps) {
  const opts = JSON.stringify(options)

  const faceLandmarker = suspend(async () => {
    if (typeof window !== 'undefined') {
      delete (window as any).process?.versions?.node
    }
    const { FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(basePath)
    return await FaceLandmarkerImpl.createFromOptions(vision, options)
  }, [basePath, opts])

  useEffect(() => {
    return () => {
      faceLandmarker?.close()
      clear([basePath, opts])
    }
  }, [faceLandmarker, basePath, opts])

  return <FaceLandmarkerContext.Provider value={faceLandmarker}>{children}</FaceLandmarkerContext.Provider>
}

export function useFaceLandmarker() {
  return useContext(FaceLandmarkerContext)
} 