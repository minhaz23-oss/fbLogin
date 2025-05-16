import React, { ReactNode } from 'react'

const AuthLayout = ({children} : {children: ReactNode}) => {
  return (
    <div className=' w-full h-screen flex items-center justify-center bg-amber-100'>
      {children}
    </div>
  )
}

export default AuthLayout
