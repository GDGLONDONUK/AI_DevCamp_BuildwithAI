import { Session } from "@/types";

export const SESSIONS: Session[] = [
  {
    id: "session-1",
    number: 1,
    title: "Kick Off",
    date: "23 April 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 1,
    topic: "Python for AI (Foundations)",
    description:
      "Welcome to AI DevCamp 2026 — Build with AI! We kick off with introductions, programme overview, and community building. Then we dive straight into Python — the language of AI — covering setup, syntax, and writing your very first AI-ready scripts.",
    speaker: "Simon Plummer",
    speakerTitle: "Lead Organiser · AI DevCamp 2026",
    isKickoff: true,
    tags: ["Python", "Kickoff", "Community", "Setup", "Beginner"],
    whatYouWillLearn: [
      "Set up your Python development environment (VSCode + Colab)",
      "Understand Python syntax: variables, data types, operators",
      "Write and run your first Python scripts",
      "Use lists, tuples and dictionaries to store data",
      "Understand the AI DevCamp programme structure and goals",
    ],
    buildIdeas: [
      "Hello World AI greeting app",
      "Personal intro generator using variables",
      "Simple number guessing game",
    ],
    resources: [
      {
        title: "Google Developers – Python Class",
        url: "https://developers.google.com/edu/python",
      },
      {
        title: "Python.org – Official Docs",
        url: "https://docs.python.org/3/tutorial/",
      },
      {
        title: "Google Colab – Free Python Notebooks",
        url: "https://colab.research.google.com/",
      },
    ],
  },
  {
    id: "session-2",
    number: 2,
    title: "Python Deep Dive",
    date: "25 April 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 1,
    topic: "Python for AI (Foundations)",
    description:
      "We go deeper into Python — the essential building blocks you'll use every day in AI and data science. Covers functions, loops, file handling, and an introduction to NumPy and Pandas for working with data.",
    tags: ["Python", "NumPy", "Pandas", "Functions", "Data"],
    whatYouWillLearn: [
      "Write reusable functions with parameters and return values",
      "Control flow: if/else, for loops, while loops",
      "Read and write CSV files with Python",
      "Manipulate data with NumPy arrays",
      "Explore datasets using Pandas DataFrames",
      "Understand list comprehensions and lambda functions",
    ],
    buildIdeas: [
      "CSV data reader and summariser",
      "Temperature converter function library",
      "Basic student grade calculator",
      "Data filter using Pandas",
    ],
    resources: [
      {
        title: "Google Developers – Python Class",
        url: "https://developers.google.com/edu/python",
      },
      {
        title: "NumPy Quickstart Tutorial",
        url: "https://numpy.org/doc/stable/user/quickstart.html",
      },
      {
        title: "Pandas Getting Started",
        url: "https://pandas.pydata.org/docs/getting_started/index.html",
      },
    ],
  },
  {
    id: "session-3",
    number: 3,
    title: "Intro to AI & ML",
    date: "30 April 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 2,
    topic: "Introduction to AI & Machine Learning",
    description:
      "The big picture of Artificial Intelligence and Machine Learning. We demystify what AI actually is, how machine learning works under the hood, and explore the main types of learning — getting hands-on with your first real ML model using Scikit-learn.",
    tags: ["AI", "Machine Learning", "Scikit-learn", "Classification", "Regression"],
    whatYouWillLearn: [
      "Understand the difference between AI, ML, and Deep Learning",
      "Supervised vs unsupervised vs reinforcement learning",
      "What features, labels, and training data mean",
      "How a model learns from data (loss, prediction, iteration)",
      "Train a simple classification model with Scikit-learn",
      "Evaluate model accuracy with train/test splits",
    ],
    buildIdeas: [
      "Spam detector (simple text classifier)",
      "Flower species classifier (Iris dataset)",
      "House price predictor (linear regression)",
    ],
    resources: [
      {
        title: "Google ML Crash Course",
        url: "https://developers.google.com/machine-learning/crash-course",
      },
      {
        title: "Scikit-learn – Getting Started",
        url: "https://scikit-learn.org/stable/getting_started.html",
      },
      {
        title: "Kaggle – Intro to ML Course",
        url: "https://www.kaggle.com/learn/intro-to-machine-learning",
      },
    ],
  },
  {
    id: "session-4",
    number: 4,
    title: "Training Your First Model",
    date: "2 May 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 2,
    topic: "Introduction to AI & Machine Learning",
    description:
      "Pure hands-on practice. You will train, tune, and evaluate machine learning models from scratch — working through real datasets and learning the full ML workflow from raw data to deployed prediction.",
    tags: ["Scikit-learn", "Model Training", "Evaluation", "Pandas", "Hands-on"],
    whatYouWillLearn: [
      "The end-to-end ML workflow: data → train → evaluate → improve",
      "Feature engineering: selecting and transforming inputs",
      "Train/test/validation splits and why they matter",
      "Hyperparameter tuning basics",
      "Cross-validation to prevent overfitting",
      "Compare multiple model types on the same dataset",
    ],
    buildIdeas: [
      "Titanic survival predictor",
      "Bike rental demand forecaster",
      "Credit risk classifier",
      "Diabetes progression predictor",
    ],
    resources: [
      {
        title: "Google ML Crash Course",
        url: "https://developers.google.com/machine-learning/crash-course",
      },
      {
        title: "Scikit-learn – Model Evaluation",
        url: "https://scikit-learn.org/stable/modules/model_evaluation.html",
      },
      {
        title: "Kaggle – Titanic Dataset",
        url: "https://www.kaggle.com/competitions/titanic",
      },
    ],
  },
  {
    id: "session-5",
    number: 5,
    title: "Math & Data for ML",
    date: "7 May 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 3,
    topic: "Math + Data for ML (Lightweight)",
    description:
      "You don't need a maths degree — but a little intuition goes a long way. We cover the core mathematical ideas behind machine learning: gradients, loss functions, linear algebra basics, and probability. Then we apply them visually using Matplotlib and Seaborn.",
    tags: ["Math", "Statistics", "Matplotlib", "Seaborn", "Loss Functions", "Probability"],
    whatYouWillLearn: [
      "Understand linear equations and how ML uses them",
      "What a loss function is and why we minimise it",
      "Gradient descent explained visually — no calculus required",
      "Probability basics: distributions, mean, variance",
      "Visualise data with Matplotlib and Seaborn",
      "Spot patterns, outliers, and correlations in datasets",
    ],
    buildIdeas: [
      "Data visualisation dashboard for a real dataset",
      "Gradient descent animation (step-by-step)",
      "Correlation heatmap explorer",
      "Distribution plotter for any CSV",
    ],
    resources: [
      {
        title: "Khan Academy – Linear Algebra",
        url: "https://www.khanacademy.org/math/linear-algebra",
      },
      {
        title: "3Blue1Brown – Essence of Linear Algebra",
        url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
      },
      {
        title: "Matplotlib Tutorials",
        url: "https://matplotlib.org/stable/tutorials/index.html",
      },
      {
        title: "Seaborn – Statistical Data Visualisation",
        url: "https://seaborn.pydata.org/tutorial.html",
      },
    ],
  },
  {
    id: "session-6",
    number: 6,
    title: "Closing & Demo Day",
    date: "19 May 2026",
    time: "6:00 PM – 9:00 PM",
    duration: "3 hours",
    week: 4,
    topic: "Neural Networks & Final Projects",
    description:
      "The grand finale of AI DevCamp 2026 — Build with AI! Attendees present their final AI projects to peers, mentors and the community. We cover the basics of neural networks, celebrate the journey, and award certifications to those who completed the programme.",
    speaker: "Simon Plummer",
    speakerTitle: "Lead Organiser · AI DevCamp 2026",
    isClosing: true,
    tags: ["Neural Networks", "Demo Day", "Projects", "Certification", "Deep Learning"],
    whatYouWillLearn: [
      "How neural networks are structured (layers, neurons, weights)",
      "What activation functions do and why they matter",
      "How backpropagation trains a neural network",
      "Build and train a neural network with TensorFlow/Keras",
      "How to present a technical AI project clearly",
      "Pathways to continue learning after the programme",
    ],
    buildIdeas: [
      "Handwritten digit classifier (MNIST)",
      "Sentiment analysis model",
      "Simple image classifier with Keras",
      "Your own final project — anything AI-powered!",
    ],
    resources: [
      {
        title: "TensorFlow – Beginner Tutorials",
        url: "https://www.tensorflow.org/tutorials/quickstart/beginner",
      },
      {
        title: "Keras – Getting Started",
        url: "https://keras.io/getting_started/",
      },
      {
        title: "Fast.ai – Practical Deep Learning",
        url: "https://course.fast.ai/",
      },
      {
        title: "3Blue1Brown – Neural Networks Series",
        url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi",
      },
    ],
  },
];

export const CURRICULUM_WEEKS = [
  {
    week: 1,
    title: "Python for AI",
    subtitle: "Foundations",
    color: "from-blue-500 to-blue-700",
    learn: [
      "Python syntax & mindset",
      "Lists, dictionaries, loops",
      "Functions & basic OOP",
      "Reading & manipulating data",
    ],
    build: ["Calculator", "Number guessing game", "Data list filter"],
    timePerDay: "1–1.5 hrs/day",
    resources: [
      {
        title: "Google Developers – Python Class",
        url: "https://developers.google.com/edu/python",
      },
    ],
  },
  {
    week: 2,
    title: "Introduction to AI & ML",
    subtitle: "",
    color: "from-purple-500 to-purple-700",
    learn: [
      "What is AI vs ML vs Deep Learning",
      "Supervised vs unsupervised learning",
      "Regression & classification",
      "Training vs testing data",
    ],
    build: ["Simple regression model", "Value prediction from datasets"],
    timePerDay: "1.5–2 hrs/day",
    resources: [
      {
        title: "Google ML Crash Course",
        url: "https://developers.google.com/machine-learning/crash-course",
      },
    ],
  },
  {
    week: 3,
    title: "Math + Data for ML",
    subtitle: "Lightweight",
    color: "from-green-500 to-green-700",
    learn: [
      "Linear regression intuition",
      "Gradients & loss functions",
      "Probability basics",
      "Data visualisation",
    ],
    build: [
      "Plot datasets using Matplotlib",
      "Experiment with learning rates",
    ],
    timePerDay: "1–1.5 hrs/day",
    resources: [
      {
        title: "Khan Academy – Linear Algebra",
        url: "https://www.khanacademy.org/math/linear-algebra",
      },
    ],
  },
  {
    week: 4,
    title: "Neural Networks & First AI Model",
    subtitle: "",
    color: "from-orange-500 to-orange-700",
    learn: [
      "Neural networks basics",
      "Training simple deep models",
      "Overfitting & optimisation",
    ],
    build: ["Handwritten digit classifier", "Simple image classifier"],
    timePerDay: "2 hrs/day",
    resources: [
      {
        title: "TensorFlow Tutorials",
        url: "https://www.tensorflow.org/learn",
      },
    ],
  },
];
