export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
}

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: "python-sqli",
    title: "Python FastAPI Endpoint",
    description: "SQL injection vulnerability, missing validation",
    language: "python",
    code: `from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/users/search")
async def search_users(query: str, db: AsyncSession = Depends(get_db)):
    # Build query from user input
    sql = f"SELECT * FROM users WHERE name LIKE '%{query}%' OR email LIKE '%{query}%'"
    result = await db.execute(text(sql))
    users = result.fetchall()

    data = []
    for user in users:
        data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "password_hash": user.password_hash,  # oops
        })
    return data

@router.post("/users/{user_id}/role")
async def update_role(user_id: int, role: str, db: AsyncSession = Depends(get_db)):
    await db.execute(text(f"UPDATE users SET role = '{role}' WHERE id = {user_id}"))
    await db.commit()
    return {"status": "ok"}
`,
  },
  {
    id: "react-hooks",
    title: "React Component",
    description: "Missing deps, any types, effect cleanup",
    language: "typescript",
    code: `import { useEffect, useState } from "react";

interface Props {
  userId: any;
  onLoad: any;
}

export function UserProfile({ userId, onLoad }: Props) {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        onLoad(data);
      });
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(\`/api/users/\${userId}/posts\`)
        .then(res => res.json())
        .then(data => setPosts(data));
    }, 5000);
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p dangerouslySetInnerHTML={{ __html: user.bio }} />
      <ul>
        {posts.map((post: any) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
`,
  },
  {
    id: "go-errors",
    title: "Go HTTP Handler",
    description: "Unchecked errors, resource leaks",
    language: "go",
    code: `package main

import (
\t"database/sql"
\t"encoding/json"
\t"fmt"
\t"net/http"
\t"os"
)

var db *sql.DB

func init() {
\tvar err error
\tdb, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
\tif err != nil {
\t\tpanic(err)
\t}
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
\tfile, _, _ := r.FormFile("document")
\tdata := make([]byte, 10*1024*1024) // 10MB buffer
\tn, _ := file.Read(data)

\t// Save to database
\tquery := fmt.Sprintf("INSERT INTO documents (content) VALUES ('%s')", string(data[:n]))
\tdb.Exec(query)

\tw.Write([]byte("uploaded"))
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
\tterm := r.URL.Query().Get("q")
\trows, _ := db.Query("SELECT id, title, body FROM documents WHERE title LIKE '%" + term + "%'")

\tvar results []map[string]interface{}
\tfor rows.Next() {
\t\tvar id int
\t\tvar title, body string
\t\trows.Scan(&id, &title, &body)
\t\tresults = append(results, map[string]interface{}{
\t\t\t"id": id, "title": title, "body": body,
\t\t})
\t}

\tjson.NewEncoder(w).Encode(results)
}

func main() {
\thttp.HandleFunc("/upload", handleUpload)
\thttp.HandleFunc("/search", handleSearch)
\thttp.ListenAndServe(":8080", nil)
}
`,
  },
];
