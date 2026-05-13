const Joi = require("joi"); // for input validation, npm install joi
const express = require("express");
const app = express();
app.use(express.json()); // to parse JSON request body, otherwise req.body will be undefined
const port = process.env.PORT || 3000; // export PORT=5000 && nodemon index.js

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const courses = [
  { id: 1, name: "Course API 1" },
  { id: 2, name: "Course API 2" },
  { id: 3, name: "Course API 3" },
  { id: 4, name: "Course API 4" },
];

app.get("/api/courses", (req, res) => {
  res.send(courses);
});

app.get("/api/courses/:id", (req, res) => {
  //   res.send(req.query); // http://localhost:3000/api/course/1?sortBy=name , it helps to get query string parameters{ ? sortBy: 'name'}
  //   res.send(req.params.id); // http://localhost:3000/api/course/1 , it helps to get route parameters { id: '1' }

  let course = courses.find((c) => c.id === parseInt(req.params.id));
  if (!course)
    res.status(404).send("The course with the given ID was not found");
  res.send(course);
});

app.post("/api/courses", (req, res) => {
  // There is two wat to validates the input, one is using if statement and another is using Joi library, which is more powerful and flexible.
  //   if (!req.body.name || req.body.name.length < 3) {
  //     // 400 Bad Request
  //     return res
  //       .status(400)
  //       .send("Name is required and should be minimum 3 characters.");
  //   }
  const schema = {
    name: Joi.string().min(3).required(),
  };
  const { error } = validateCourse(req.body);
  if (error) {
    // 400 Bad Request
    return res.status(400).send(`Error: ${error.details[0].message}`);
  }
  const course = {
    id: courses.length + 1,
    name: req.body.name,
  };
  courses.push(course);
  res.send(course);
});

app.put("/api/courses/:id", (req, res) => {
  const getCourse = isValidCourse(courses, req.params.id);
  if (!getCourse) {
    return res.status(404).send("The course with the given ID was not found");
  }
  const { error } = validateCourse(req.body);
  if (error) {
    return res.status(400).send(`Error: ${error.details[0].message}`);
  }
  getCourse.name = req.body.name;
  res.send(getCourse);
});

app.delete("/api/courses/:id", (req, res) => {
  const getCourse = isValidCourse(courses, req.params.id);
  if (!getCourse) {
    return res.status(404).send("The course with the given ID was not found");
  }
  const index = courses.indexOf(getCourse);
  courses.splice(index, 1);
  res.send(getCourse);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function validateCourse(course) {
  const schema = {
    name: Joi.string().min(3).required(),
  };
  return Joi.validate(course, schema);
}

function isValidCourse(course, id) {
  const getCourse = courses.find((c) => c.id === parseInt(id));
  if (!getCourse) {
    return null;
  }
  return getCourse;
}
