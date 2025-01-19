import { gql } from '@apollo/client';

// Query to get all evaluations
export const GET_EVALUATIONS = gql`
  query GetEvaluations {
    getEvaluations {
      id
      module {
        id
        title
      }
      pass_score
    }
  }
`;

// Query to get a specific evaluation by ID
export const GET_EVALUATION_BY_ID = gql`
  query GetEvaluationById($id: Float!) {
    getEvaluationById(id: $id) {
      id
      module {
        id
        title
      }
      pass_score
      questions {
        id
        content
        options
      }
    }
  }
`;

// Query to get questions for a specific evaluation
export const GET_QUESTIONS_BY_EVALUATION = gql`
  query GetQuestionsByEvaluation($evaluationId: Int!) {
    getQuestionsByEvaluation(evaluationId: $evaluationId) {
      id
      content
      options
    }
  }
`;

// Mutation to create an evaluation
export const CREATE_EVALUATION = gql`
  mutation CreateEvaluation($createEvaluationInput: CreateEvaluationDTO!) {
    createEvaluation(createEvaluationInput: $createEvaluationInput) {
      id
      module {
        id
        title
      }
      pass_score
    }
  }
`;

// Mutation to update an evaluation
export const UPDATE_EVALUATION = gql`
  mutation UpdateEvaluation($id: Int!, $updateEvaluationInput: UpdateEvaluationDTO!) {
    updateEvaluation(id: $id, updateEvaluationInput: $updateEvaluationInput) {
      id
      module {
        id
        title
      }
      pass_score
    }
  }
`;

// Mutation to delete an evaluation
export const DELETE_EVALUATION = gql`
  mutation DeleteEvaluation($id: Int!) {
    deleteEvaluation(id: $id)
  }
`;

// Mutation to create a question
export const CREATE_QUESTION = gql`
  mutation CreateQuestion($evaluationId: Int!, $createQuestionInput: CreateQuestionDTO!) {
    createQuestion(evaluationId: $evaluationId, createQuestionInput: $createQuestionInput) {
      id
      content
      options
      correct_answer
    }
  }
`;

// Mutation to update a question
export const UPDATE_QUESTION = gql`
  mutation UpdateQuestion($id: Int!, $updateQuestionInput: UpdateQuestionDTO!) {
    updateQuestion(id: $id, updateQuestionInput: $updateQuestionInput) {
      id
      content
      options
      correct_answer
    }
  }
`;

// Mutation to delete a question
export const DELETE_QUESTION = gql`
  mutation DeleteQuestion($id: Int!) {
    deleteQuestion(id: $id)
  }
`;

// Mutation to submit an answer
export const CREATE_ANSWER = gql`
  mutation CreateAnswer($userId: Int!, $questionId: Int!, $createAnswerInput: CreateAnswerDTO!) {
    createAnswer(userId: $userId, questionId: $questionId, createAnswerInput: $createAnswerInput) {
      id
      answer_text
      is_correct
      submitted_at
    }
  }
`;

// Mutation to validate answers for an evaluation
export const VALIDATE_ANSWERS = gql`
  mutation ValidateAnswers($evaluationId: Float!, $userId: Float!, $userAnswers: [UserAnswerInput!]!) {
    validateAnswers(evaluationId: $evaluationId, userId: $userId, userAnswers: $userAnswers) {
      score
      passed
    }
  }
`;

export const GET_EVALUATIONS_BY_MODULE = gql`
  query GetEvaluationsByModule($moduleId: Float!) {
    getEvaluationsByModule(moduleId: $moduleId) {
      id
      pass_score
    }
  }
`;

export const GET_USER_EVALUATION_RESULTS = gql`
  query GetUserEvaluationResults($userId: Float!) {
    getUserEvaluationResults(userId: $userId) {
      id
      score
      passed
      completed_at
      evaluation {
        id
        pass_score
        module {
          id
          title
          description
        }
      }
    }
  }
`;