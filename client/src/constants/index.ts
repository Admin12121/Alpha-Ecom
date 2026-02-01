type SignInFormProps = {
    id: string;
    type: "email" | "password";
    label: string;
    placeholder: string;
    name: string;
    inputType: "input";
};

type SignUpFormProps = {
    id: string;
    type: "text" | "email" | "password";
    label: string;
    placeholder: string;
    name: string;
    inputType: "input";
};

export const Next_CONSTANTS: {
    signInForm: SignInFormProps[];
    signUpForm: SignUpFormProps[];
} = {
    signInForm: [
        {
            id: "1",
            name: "email",
            label: "Email",
            placeholder: "Enter your email",
            type: "email",
            inputType: "input",
        },
        {
            id: "2",
            name: "password",
            label: "Password",
            placeholder: "Enter your password",
            type: "password",
            inputType: "input",
        },
    ],
    signUpForm: [
        {
            id: "1",
            name: "fullname",
            label: "Full Name",
            placeholder: "Enter your full name",
            type: "text",
            inputType: "input",
        },
        {
            id: "2",
            name: "email",
            label: "Email",
            placeholder: "Enter your email",
            type: "email",
            inputType: "input",
        },
        {
            id: "3",
            name: "password",
            label: "Password",
            placeholder: "Enter your password",
            type: "password",
            inputType: "input",
        },
        {
            id: "4",
            name: "confirmPassword",
            label: "Confirm Password",
            placeholder: "Confirm your password",
            type: "password",
            inputType: "input",
        },
    ],
};
