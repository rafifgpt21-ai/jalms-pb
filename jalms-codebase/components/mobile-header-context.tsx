"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface MobileHeaderState {
    title: ReactNode | string
    subtitle?: ReactNode | string
    showMobileSubtitle?: boolean
    image?: string | null
    leftAction?: ReactNode
    rightAction?: ReactNode
}

interface MobileHeaderContextType extends MobileHeaderState {
    setHeader: (state: MobileHeaderState) => void
    resetHeader: () => void
}

const MobileHeaderContext = createContext<MobileHeaderContextType | undefined>(undefined)

export function MobileHeaderProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MobileHeaderState>({
        title: null,
        subtitle: null,
        showMobileSubtitle: true,
        image: null,
        leftAction: null,
        rightAction: null,
    })

    const setHeader = useCallback((newState: MobileHeaderState) => {
        setState(prev => ({ ...prev, ...newState }))
    }, [])

    const resetHeader = useCallback(() => {
        setState({
            title: null,
            subtitle: null,
            showMobileSubtitle: true,
            image: null,
            leftAction: null,
            rightAction: null,
        })
    }, [])

    return (
        <MobileHeaderContext.Provider value={{ ...state, setHeader, resetHeader }}>
            {children}
        </MobileHeaderContext.Provider>
    )
}

export function useMobileHeader() {
    const context = useContext(MobileHeaderContext)
    if (context === undefined) {
        throw new Error("useMobileHeader must be used within a MobileHeaderProvider")
    }
    return context
}
