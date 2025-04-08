import { gql } from "@apollo/client"

export const GET_ALL_COURSES = gql`
  query GetAllCoursesInstruction {
    getAllCoursesInstruction {
      id
      instructor {
        id
        first_name
      }
      student {
        id
        first_name
      }
      startTime
      endTime
      status
    }
  }
`

export const GET_COURSE_BY_ID = gql`
  query GetCourseInstructionById($id: Int!) {
    getCourseInstructionById(id: $id) {
      id
      instructor {
        id
        first_name
        last_name
      }
      student {
        id
        first_name
        last_name
      }
      startTime
      endTime
      status
      feedback
      rating
      competencies {
        id
        name
        description
        validated
      }
      comments {
        id
        content
        creationDate
        author {
          id
          first_name
        }
      }
    }
  }
`

export const GET_COURSE_BY_USER_ID = gql`
  query GetCoursesByUserId($userId: Int!) {
    getCoursesByUserId(userId: $userId) {
      id
      instructor {
        id
        first_name
        last_name
      }
      student {
        id
        first_name
        last_name
      }
      startTime
      endTime
      status
      feedback
      rating
      competencies {
        id
        name
        description
        validated
      }
      comments {
        id
        content
        creationDate
        author {
          id
          first_name
        }
      }
    }
  }
`

export const ADD_COMMENT = gql`
  mutation AddCommentToCourse($input: AddCommentInput!) {
    addCommentToCourse(input: $input) {
      id
      content
      creationDate
      author {
        id
        first_name
      }
    }
  }
`

export const CREATE_COURSE = gql`
  mutation CreateCourseInstruction($input: CreateCourseInstructionInput!) {
    createCourseInstruction(input: $input) {
      id
      instructor {
        id
      }
      student {
        id
      }
      startTime
      endTime
    }
  }
`;


export const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      first_name
      last_name
      role {
        role_name
      }
    }
  }
`;

export const ADD_COMPETENCY = gql`
  mutation AddCompetencyToCourse($input: AddCompetencyInput!) {
    addCompetencyToCourse(input: $input) {
      id
      name
      description
      validated
    }
  }
`

export const VALIDATE_COMPETENCY = gql`
  mutation ValidateCompetency($competencyId: Int!) {
    validateCompetency(competencyId: $competencyId) {
      id
      validated
    }
  }
`

export const RATE_COURSE = gql`
mutation RateCourse($id: Int!, $rating: Int!, $feedback: String!) {
  rateCourseInstruction(id: $id, rating: $rating, feedback: $feedback) {
    id
    feedback
    rating
  }
}
`

export const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: Int!, $input: UpdateCourseInstructionInput!) {
    updateCourse(id: $id, input: $input) {
      id
      startTime
      endTime
      instructor {
        id
        first_name
      }
    }
  }
`


export const GET_COMPETENCIES = gql`
  query GetAllCompetencies {
    getAllCompetencies {
      id
      name
      description
    }
  }
`

export const DELETE_COURSE = gql`
  mutation DeleteCourse($id: Int!) {
    deleteCourse(id: $id)
  }
`