import { SignUp } from '@clerk/nextjs'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  // Await searchParams as it's now a Promise in Next.js 15+
  const params = await searchParams
  // Decode the redirect_url if it exists, otherwise default to /dashboard
  const redirectUrl = params.redirect_url 
    ? decodeURIComponent(params.redirect_url)
    : '/dashboard'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp 
        routing="path"
        path="/sign-up"
        forceRedirectUrl={redirectUrl}
        signInUrl="/sign-in"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg dark:bg-[#282c34] dark:border dark:border-[#4a5568]",
          }
        }}
      />
    </div>
  )
}

