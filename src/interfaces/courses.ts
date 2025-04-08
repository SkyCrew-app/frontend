export interface Lesson {
  id: string
  title: string
  description: string
  video_url?: string
  content: {
    title: string
    sections: {
      heading: string
      body: string
    }[]
  }
}

export interface Course {
  id: string
  title: string
  description: string
  required_license: string
  modules: {
    id: string
    title: string
    lessons: Lesson[]
  }[]
}