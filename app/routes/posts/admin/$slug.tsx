import { ActionFunction, json, LoaderArgs, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { createPost, deletePost, getPost, updatePost } from "~/models/post.server";
import { Form, useActionData, useCatch, useLoaderData, useParams, useTransition } from "@remix-run/react";

type ActionData =
  | {
  title: null | string;
  slug: null | string;
  markdown: null | string
} | undefined;

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg`;

export const loader = async ({ params }: LoaderArgs) => {
  
  invariant(params.slug, `slug is required`)

  if(params.slug === "new") {
    return json({post: null})
  }

  const post = await getPost(params.slug)

  if(!post) {
    throw new Response("Not Found", {status: 404})
  }
  return json({post})
}

export const action: ActionFunction = async({request, params}) => {

  invariant(params.slug, "slug is required");

  // TODO: remove me
  await new Promise((res) => setTimeout(res, 1000));

  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "delete") {
    await deletePost(params.slug);
    return redirect("/posts/admin");
  }

  const title = formData.get("title");
  const slug = formData.get("slug");
  const markdown = formData.get("markdown")


  const errors: ActionData = {
    title: title ? null : "Title is required",
    slug: slug ? null : "Slug is required",
    markdown: markdown ? null : "Markdown is required"
  };

  const hasErrors = Object.values(errors).some(
    (errorMessage) => errorMessage
  )
  if(hasErrors) {
    return json<ActionData>(errors)
  }

  invariant(
    typeof title === "string",
    "title must be a string"
  );
  invariant(
    typeof slug === "string",
    "slug must be a string"
  );
  invariant(
    typeof markdown === "string",
    "markdown must be a string"
  );

  if (params.slug === "new") {
    await createPost({ title, slug, markdown });
  } else {
    await updatePost(params.slug, { title, slug, markdown });
  }

  return redirect("/posts/admin")


}

export default function NewPostRoute() {

  const { post } = useLoaderData<typeof loader>()

  const errors = useActionData();

  const transition = useTransition();
  const isCreating = transition.submission?.formData.get("intent") === "create";
  const isUpdating = transition.submission?.formData.get("intent") === "update";
  const isDeleting = transition.submission?.formData.get("intent") === "delete";
  const isNewPost = post == null // is null or undefined

  return (
      <Form method="post" key={post?.slug ?? "new"}>
        <p>
          <label>
            Post Title:{" "}
            {errors?.title ? (
              <em className="text-red-600">{errors.title}</em>
            ) : null}
            <input
              type="text"
              name="title"
              defaultValue={post?.title}
              className={inputClassName}
            />
          </label>
        </p>
        <p>
          <label>
            Post Slug:{" "}
            {errors?.slug ? (
              <em className="text-red-600">{errors.slug}</em>
            ) : null}
            <input
              type="text"
              name="slug"
              className={inputClassName}
              defaultValue={post?.slug}
            />
          </label>
        </p>
        <p>
          <label htmlFor="markdown">
            Markdown:
            {errors?.markdown ? (
              <em className="text-red-600">
                {errors.markdown}
              </em>
            ) : null}
          </label>
          <br />
          <textarea
            id="markdown"
            rows={20}
            name="markdown"
            defaultValue={post?.markdown}
            className={`${inputClassName} font-mono`}
          />
        </p>
        <div className="flex justify-end gap-4">
          {isNewPost ? null : (
            <button
              type="submit"
              name="intent"
              value="delete"
              className="rounded bg-red-500 py-2 px-4 text-white hover:bg-red-600 focus:bg-red-400 disabled:bg-red-300"
              disabled={isDeleting}
              >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
          <button
            type="submit"
            name="intent"
            value={isNewPost ? "create" : "update"}
            className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
            disabled={isCreating || isUpdating}
          >
            {isNewPost ? (isCreating ? "Creating..." : "Create Post") : null}
            {isNewPost ? null : isUpdating ? "Updating..." : "Update"}
          </button>
        </div>
      </Form>
  )

}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  if (caught.status === 404) {
    return (
      <div className="text-red-500">
        Uh oh! The post with the slug "{params.slug}" does not exist!
      </div>
    );
  }
  throw new Error(`Unsupported thrown response status code: ${caught.status}`);
}


export function ErrorBoundary({ error }: { error: unknown }) {
  if (error instanceof Error) {
    return (
      <div className="text-red-500">
        Oh no, something went wrong!
        <pre>{error.message}</pre>
      </div>
    );
  }
  return <div className="text-red-500">Oh no, something went wrong!</div>;
}



