import { Component, type ReactNode } from 'react'

type SceneErrorBoundaryProps = {
  children: ReactNode
}

type SceneErrorBoundaryState = {
  failed: boolean
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}
