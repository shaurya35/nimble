import { SignIn } from '@clerk/nextjs'

export default async function SignInPage({
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
      <SignIn 
        routing="path"
        path="/sign-in"
        forceRedirectUrl={redirectUrl}
        signUpUrl="/sign-up"
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

