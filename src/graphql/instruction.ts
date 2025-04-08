import { gql } from '@apollo/client';

export const GET_COURSES = gql`
  query GetCourses($category: String, $search: String) {
    getCourses(category: $category, search: $search) {
      id
      title
      required_license
    }
  }
`;

export const GET_COURSE_DETAILS = gql`
  query GetCourseDetails($id: Float!, $userId: Float) {
    getCourseById(id: $id, userId: $userId) {
      id
      title
      description
      category
      required_license
      modules {
        id
        title
        description
        lessons {
          id
          title
          description
          video_url
        }
        evaluations {
          id
          pass_score
        }
      }
    }
  }
`

export const MARK_LESSON_COMPLETED = gql`
  mutation MarkLessonCompleted($lessonId: Float!, $userId: Float!) {
    markLessonCompleted(lessonId: $lessonId, userId: $userId)
  }
`;

export const GET_COURSE_PROGRESS = gql`
  query GetCourseProgress($userId: Float!, $courseId: Float!) {
    getCourseProgress(userId: $userId, courseId: $courseId)
  }
`;

export const GET_LESSON_CONTENT = gql`
  query GetLessonContent($lessonId: Float!, $userId: Float!) {
    getLessonContent(lessonId: $lessonId, userId: $userId) {
      id
      title
      description
      content
      video_url
      attachments
    }
  }
`

export const COMPLETE_LESSON = gql`
  mutation CompleteLesson($lessonId: Float!, $userId: Float!) {
    completeLesson(lessonId: $lessonId, userId: $userId)
  }
`

export const GET_LESSON_PROGRESS = gql`
  query GetUserProgress($userId: Float!, $lessonId: Float!) {
    getUserProgress(userId: $userId, lessonId: $lessonId)
  }
`