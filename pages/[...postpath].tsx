import React from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { GraphQLClient, gql } from "graphql-request";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  try {
    const endpoint = process.env.GRAPHQL_ENDPOINT as string;
    const graphQLClient = new GraphQLClient(endpoint);
    const referringURL = ctx.req.headers?.referer || null;
    const pathArr = ctx.query.postpath as Array<string>;
    const path = pathArr.join("/");
    console.log(path);
    const fbclid = ctx.query.fbclid;
    console.log(referringURL);

    // Redirect if facebook is the referer or request contains fbclid
    if (referringURL?.includes("facebook.com") || fbclid) {
      return {
        redirect: {
          permanent: false,
          destination: `${
            endpoint.replace(/(\/graphql\/)/, "/") + encodeURI(path as string)
          }`,
        },
      };
    }

    // Fetch article data from WordPress using GraphQL
    const query = gql`
      {
        post(id: "/${path}/", idType: URI) {
          id
          title
          content
          dateGmt
          modifiedGmt
          excerpt
          author {
            node {
              name
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          mediaItems {
            nodes {
              sourceUrl
              altText
            }
          }
        }
      }
    `;

    const data = await graphQLClient.request(query);

    if (!data.post) {
      throw new Error("Post not found");
    }

    return {
      props: {
        post: data.post,
      },
    };
  } catch (error) {
    console.error("Error fetching data:", error.message);
    return {
      notFound: true,
    };
  }
};

interface PostProps {
  post: any;
}

const Post: React.FC<PostProps> = ({ post }) => {
  // Function to remove HTML tags from excerpt
  const removeTags = (str: string) => {
    if (str === null || str === "") return "";
    else str = str.toString();
    return str.replace(/(<([^>]+)>)/gi, "").replace(/\[[^\]]*\]/, "");
  };

  return (
    <>
      <Head>
        {/* Open Graph meta tags for Facebook sharing */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={removeTags(post.excerpt)} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Your Site Name" />
        <meta property="article:published_time" content={post.dateGmt} />
        <meta property="article:modified_time" content={post.modifiedGmt} />
        {post.featuredImage && (
          <>
            <meta property="og:image" content={post.featuredImage.node.sourceUrl} />
            <meta
              property="og:image:alt"
              content={post.featuredImage.node.altText || post.title}
            />
          </>
        )}
        {/* Add additional OG meta tags as needed */}
        <title>{post.title}</title>
      </Head>
      <article>
        <h1>{post.title}</h1>
        {post.featuredImage && (
          <img
            src={post.featuredImage.node.sourceUrl}
            alt={post.featuredImage.node.altText || post.title}
          />
        )}
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  );
};

export default Post;
