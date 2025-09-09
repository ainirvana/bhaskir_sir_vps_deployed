export async function createSlideDirectory(data: {
  name: string
  description: string
  createdBy: string
}) {
  try {
    const response = await fetch('/api/slides/directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create directory')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateSlideDirectory(
  directoryId: string,
  data: {
    name: string
    description: string
    isPublished?: boolean
  }
) {
  try {
    const response = await fetch('/api/slides/directory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directoryId,
        ...data,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update directory')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteSlideDirectory(directoryId: string) {
  try {
    const response = await fetch(`/api/slides/directory?directoryId=${directoryId}`, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete directory')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createSlide(data: {
  title: string
  content: string
  type: string
  directoryId: string
  createdBy: string
}) {
  try {
    const response = await fetch('/api/slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create slide')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateSlide(slideId: string, data: {
  title: string
  content: string
}) {
  try {
    const response = await fetch('/api/slides', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slideId,
        ...data,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update slide')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteSlide(slideId: string) {
  try {
    const response = await fetch(`/api/slides?slideId=${slideId}`, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete slide')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function reorderSlides(directoryId: string, slideOrders: { id: string; order: number }[]) {
  try {
    const response = await fetch('/api/slides/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directoryId,
        slideOrders,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to reorder slides')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
