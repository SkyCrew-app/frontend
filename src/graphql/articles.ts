import { gql } from "@apollo/client"

export const GET_ARTICLE_BY_ID = gql`
  query GetArticleById($id: Int!) {
    article(id: $id) {
      id
      title
      description
      text
      tags
      photo_url
      createdAt
      eventDate
      documents_url
    }
  }
`

export const GET_ARTICLES = gql`
query GetArticles {
  articles {
    id
    title
    description
    text
    tags
    photo_url
    createdAt
    eventDate
  }
}
`

export const CREATE_ARTICLE = gql`
  mutation CreateArticle(
    $title: String!
    $description: String!
    $text: String!
    $tags: [String!]!
    $eventDate: DateTime
    $photo: Upload
    $documents: [Upload!]
  ) {
    createArticle(
      createArticleInput: {
        title: $title
        description: $description
        text: $text
        tags: $tags
        eventDate: $eventDate
      }
      photo: $photo
      documents: $documents
    ) {
      id
      title
      createdAt
    }
  }
`

export const UPDATE_ARTICLE = gql`
  mutation UpdateArticle(
    $id: ID!
    $title: String!
    $description: String!
    $text: String!
    $tags: [String!]!
    $eventDate: DateTime!
  ) {
    updateArticle(
      updateArticleInput: {
        id: $id
        title: $title
        description: $description
        text: $text
        tags: $tags
        eventDate: $eventDate
      }
    ) {
      id
      title
      updatedAt
    }
  }
`

export const DELETE_ARTICLE = gql`
  mutation RemoveArticle($id: Int!) {
    removeArticle(id: $id) {
      id
      title
    }
  }
`
