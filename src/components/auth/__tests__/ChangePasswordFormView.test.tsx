import { authClient } from "@/api/authClient";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordFormView } from "../ChangePasswordFormView";

// The real authClient would make HTTP calls to hotels-api. Replace it with a
// fake whose changePassword we control per test.
jest.mock("@/api/authClient", () => ({
  authClient: { changePassword: jest.fn() },
}));

const changePassword = jest.mocked(authClient.changePassword);

// Fills the three fields and submits, the way a user would.
async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  fields: { current?: string; next?: string; confirm?: string } = {},
) {
  const current = fields.current ?? "old-password";
  const next = fields.next ?? "new-password";
  const confirm = fields.confirm ?? next;
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ChangePasswordFormView", () => {
  beforeEach(() => {
    changePassword.mockReset();
  });

  it("shows validation errors and does not call the API when the form is empty", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordFormView />);

    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("Current password is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("New password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects a confirmation that does not match the new password", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordFormView />);

    await fillAndSubmit(user, { confirm: "something-else" });

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("sends the passwords to the API, shows success and clears the form", async () => {
    // Better Auth resolves with { data, error }; error is null on success.
    changePassword.mockResolvedValue({ data: {}, error: null } as never);
    const user = userEvent.setup();
    render(<ChangePasswordFormView />);

    await fillAndSubmit(user);

    expect(
      await screen.findByText("Password changed successfully!"),
    ).toBeInTheDocument();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("shows the server's error message and no success message", async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid password" },
    } as never);
    const user = userEvent.setup();
    render(<ChangePasswordFormView />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid password",
    );
    expect(
      screen.queryByText("Password changed successfully!"),
    ).not.toBeInTheDocument();
  });
});
