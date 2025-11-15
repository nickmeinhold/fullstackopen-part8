const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/use/ws");
const express = require("express");
const cors = require("cors");
const http = require("http");

const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
const { v1: uuid } = require("uuid");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");
const seedDatabase = require("./seed");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
    seedDatabase();
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error.message);
  });

const typeDefs = `
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    id: ID!
    bookCount: Int!
  }

  type Query {
    me: User
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Subscription {
    bookAdded: Book!
  }

  type Mutation {
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    addAuthor(
      name: String!
      born: Int
    ): Author
    editAuthor(
      name: String!
      setBornTo: Int
    ): Author
  }
`;

const resolvers = {
  Query: {
    me: (root, args, context) => {
      return context.currentUser;
    },
    authorCount: async () => Author.countDocuments(),
    bookCount: async () => Book.countDocuments(),
    allBooks: async (root, args) => {
      const query = {};

      if (args.author) {
        const author = await Author.findOne({ name: args.author });
        if (author) {
          query.author = author._id;
        }
      }

      if (args.genre) {
        query.genres = args.genre;
      }

      return Book.find(query).populate("author");
    },
    allAuthors: async () => Author.find({}),
  },
  Author: {
    bookCount: async (root) => {
      return Book.countDocuments({ author: root._id });
    },
  },
  Mutation: {
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      try {
        await user.save();
        return user;
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.username,
            error: error.message,
          },
        });
      }
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "secret") {
        throw new GraphQLError("wrong credentials", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
    addBook: async (root, args, context) => {
      console.log("addBook mutation called with:", args);
      console.log("currentUser:", context.currentUser?.username || "null");

      const currentUser = context.currentUser;

      if (!currentUser) {
        console.log("User not authenticated!");
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      try {
        let author = await Author.findOne({ name: args.author });

        if (!author) {
          author = new Author({ name: args.author });
          await author.save();
        }

        const book = new Book({
          title: args.title,
          published: args.published,
          author: author._id,
          genres: args.genres,
        });

        await book.save();
        const populatedBook = await book.populate("author");

        console.log("Publishing BOOK_ADDED event for:", populatedBook.title);
        pubsub.publish("BOOK_ADDED", { bookAdded: populatedBook });
        console.log("Event published");

        return populatedBook;
      } catch (error) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.author || args.title,
            error: error.message,
          },
        });
      }
    },
    addAuthor: async (root, args) => {
      const author = new Author({ ...args });
      await author.save();
      return author;
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new GraphQLError("not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const author = await Author.findOne({ name: args.name });
      if (!author) {
        return null;
      }

      author.born = args.setBornTo;
      await author.save();
      return author;
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(["BOOK_ADDED"]),
    },
  },
};

const start = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/",
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const auth = ctx.connectionParams?.authorization;
        if (auth && auth.startsWith("Bearer ")) {
          const decodedToken = jwt.verify(
            auth.substring(7),
            process.env.JWT_SECRET
          );
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        }
        return { currentUser: null };
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    "/",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;
        if (auth && auth.startsWith("Bearer ")) {
          const decodedToken = jwt.verify(
            auth.substring(7),
            process.env.JWT_SECRET
          );
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        }
        return { currentUser: null };
      },
    })
  );

  const PORT = 4000;

  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}`)
  );
};

start();
